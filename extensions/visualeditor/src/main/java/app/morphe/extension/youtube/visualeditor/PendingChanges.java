/*
 * Copyright 2026 Morphe.
 * https://github.com/MorpheApp/morphe-patches
 *
 * See the included NOTICE file for GPLv3 Section 7 terms that apply to this code.
 */

package app.morphe.extension.youtube.visualeditor;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Process;

import androidx.annotation.Nullable;

import org.json.JSONObject;

import java.util.Iterator;

import app.morphe.extension.shared.Logger;
import app.morphe.extension.shared.Utils;
import app.morphe.extension.shared.settings.BooleanSetting;
import app.morphe.extension.shared.settings.FloatSetting;
import app.morphe.extension.shared.settings.IntegerSetting;
import app.morphe.extension.shared.settings.LongSetting;
import app.morphe.extension.shared.settings.Setting;

/**
 * Changes saved in the editor that only apply after YouTube restarts, and were not applied yet.
 * <p>
 * Every value is written to the real Morphe setting right away, so nothing is lost when the user
 * leaves with "Save for later". For each such setting this keeps the value YouTube is still running
 * with (the value before the first change since the last start), so the editor can tell the user
 * next time and offer to apply (restart), reset (put those values back) or keep editing.
 * <p>
 * The list belongs to one run of YouTube: once the process has restarted, every saved value is in
 * use, and the list is dropped.
 */
final class PendingChanges {

    private static final String PREFS = "morphe_visual_editor_pending";
    private static final String RUN = "run";
    private static final String CHANGES = "changes";

    private PendingChanges() {
    }

    /** This run of YouTube: the process id and its start time, so a reused pid is not mistaken. */
    private static String thisRun() {
        long start = 0;
        try {
            start = Process.getStartUptimeMillis();
        } catch (Throwable ignored) {
            // older Android: the pid alone
        }
        return Process.myPid() + ":" + start;
    }

    @Nullable
    private static SharedPreferences prefs() {
        try {
            Context c = Utils.getContext();
            return c == null ? null : c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        } catch (Throwable ex) {
            return null;
        }
    }

    /** The stored list, {key: value YouTube runs with, as saveFromString reads it}; empty after a restart. */
    private static JSONObject load() {
        SharedPreferences p = prefs();
        if (p == null) return new JSONObject();
        try {
            if (!thisRun().equals(p.getString(RUN, ""))) {
                if (p.contains(CHANGES)) p.edit().remove(CHANGES).remove(RUN).apply();
                return new JSONObject();
            }
            return new JSONObject(p.getString(CHANGES, "{}"));
        } catch (Exception ex) {
            return new JSONObject();
        }
    }

    private static void store(JSONObject changes) {
        SharedPreferences p = prefs();
        if (p == null) return;
        if (changes.length() == 0) p.edit().remove(CHANGES).remove(RUN).apply();
        else p.edit().putString(RUN, thisRun()).putString(CHANGES, changes.toString()).apply();
    }

    /** Call before a setting is saved from the editor, with its value at that moment. */
    static void beforeSave(Setting<?> s, String valueBefore) {
        if (!s.rebootApp) return;
        try {
            JSONObject c = load();
            if (!c.has(s.key)) {
                c.put(s.key, valueBefore);
                store(c);
            }
        } catch (Exception ex) {
            Logger.printException(() -> "Visual editor: could not note a pending change", ex);
        }
    }

    /** Call after a setting is saved: back at the running value means nothing is pending for it. */
    static void afterSave(Setting<?> s) {
        if (!s.rebootApp) return;
        JSONObject c = load();
        if (c.has(s.key) && c.optString(s.key).equals(String.valueOf(s.get()))) {
            c.remove(s.key);
            store(c);
        }
    }

    /**
     * The page's own list of changes waiting for a restart, {key: running value as JSON}. Adds the
     * ones not noted yet (a running value already noted is older, so it is kept).
     */
    static void merge(String json, java.util.Set<String> allowed) {
        try {
            JSONObject in = new JSONObject(json), c = load();
            boolean changed = false;
            for (Iterator<String> it = in.keys(); it.hasNext(); ) {
                String key = it.next();
                Setting<?> s = SettingsBridge.setting(key);
                if (!allowed.contains(key) || s == null || !s.rebootApp || c.has(key)) continue;
                Object v = in.opt(key);
                if (v == null || v == JSONObject.NULL) continue;
                String running = String.valueOf(v);
                if (running.equals(String.valueOf(s.get()))) continue;
                c.put(key, running);
                changed = true;
            }
            if (changed) store(c);
        } catch (Exception ex) {
            Logger.printException(() -> "Visual editor: could not save the pending list", ex);
        }
    }

    /**
     * What is saved but not applied yet, as {key: value YouTube still runs with}, typed for the page.
     * Settings whose saved value is the running value again are left out.
     */
    static JSONObject forPage() {
        JSONObject c = load(), out = new JSONObject();
        boolean dropped = false;
        for (Iterator<String> it = c.keys(); it.hasNext(); ) {
            String key = it.next();
            Setting<?> s = SettingsBridge.setting(key);
            String running = c.optString(key);
            if (s == null || running.equals(String.valueOf(s.get()))) {
                dropped = true;
                continue;
            }
            try {
                out.put(key, typed(s, running));
            } catch (Exception ignored) {
                // skip a value the page could not read
            }
        }
        if (dropped) {
            JSONObject keep = new JSONObject();
            for (Iterator<String> it = out.keys(); it.hasNext(); ) {
                String key = it.next();
                try {
                    keep.put(key, c.optString(key));
                } catch (Exception ignored) {
                    // cannot happen: the key is a string
                }
            }
            store(keep);
        }
        return out;
    }

    /**
     * "Reset": puts every pending setting back to the value YouTube runs with, without asking (it
     * is the value already in use), and empties the list.
     *
     * @return The keys that were put back.
     */
    static Iterable<String> reset() {
        JSONObject c = load();
        java.util.List<String> done = new java.util.ArrayList<>();
        for (Iterator<String> it = c.keys(); it.hasNext(); ) {
            String key = it.next();
            Setting<?> s = SettingsBridge.setting(key);
            if (s == null) continue;
            try {
                s.saveFromString(c.optString(key));
                done.add(key);
            } catch (RuntimeException | LinkageError ex) {
                Logger.printException(() -> "Visual editor: could not reset " + key, ex);
            }
        }
        store(new JSONObject());
        return done;
    }

    /** Restarting applies everything: the list is done. */
    static void clear() {
        store(new JSONObject());
    }

    private static Object typed(Setting<?> s, String v) {
        try {
            if (s instanceof BooleanSetting) return Boolean.parseBoolean(v);
            if (s instanceof IntegerSetting) return Integer.parseInt(v);
            if (s instanceof LongSetting) return Long.parseLong(v);
            if (s instanceof FloatSetting) return Float.parseFloat(v);
        } catch (NumberFormatException ignored) {
            // fall through: the page gets the text
        }
        return v;
    }
}
