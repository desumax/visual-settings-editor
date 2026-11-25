/*
 * Copyright 2026 Morphe.
 * https://github.com/MorpheApp/morphe-patches
 *
 * See the included NOTICE file for GPLv3 Section 7 terms that apply to this code.
 */

package app.morphe.extension.youtube.visualeditor;

import android.preference.EditTextPreference;
import android.preference.ListPreference;
import android.preference.Preference;
import android.preference.PreferenceGroup;
import android.preference.PreferenceScreen;
import android.preference.TwoStatePreference;

import androidx.annotation.Nullable;

import org.json.JSONArray;
import org.json.JSONObject;

import java.lang.ref.WeakReference;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import app.morphe.extension.shared.Logger;
import app.morphe.extension.shared.settings.BooleanSetting;
import app.morphe.extension.shared.settings.EnumSetting;
import app.morphe.extension.shared.settings.FloatSetting;
import app.morphe.extension.shared.settings.IntegerSetting;
import app.morphe.extension.shared.settings.LongSetting;
import app.morphe.extension.shared.settings.Setting;
import app.morphe.extension.shared.settings.StringSetting;

/**
 * The rows of the installed Morphe settings list, for the web editor: one entry per row, and only
 * for rows that exist. A setting gets an entry when Morphe's list shows it (the live list, or
 * morphe_prefs.xml when the live list is gone): Morphe loads every Setting whatever patches were
 * picked, so a setting whose patch was left out has no row and no entry. Action rows (import /
 * export, links...) are entries too. Each entry carries the type, default, availability and the
 * translated title, summaries and list entries. The web editor builds its list from these entries
 * alone (adaptCatalogue in app-pre.js); its catalogue only adds preview hints.
 */
final class LiveSettings {

    private LiveSettings() {
    }

    /** Must run on the main thread: it reads the live preference rows. */
    static JSONObject meta() {
        JSONObject out = new JSONObject();
        Map<String, Row> rows = new HashMap<>();
        PreferenceScreen root = VisualEditorEntry.liveRoot();
        // Every leaf row in list order, local to this read so no Preference (and through it the
        // settings activity) is kept once the editor closes.
        List<Row> actionRows = new ArrayList<>();
        ACTIONS.clear();
        if (root != null) walk(root, null, null, 0, rows, actionRows);
        PreferenceTree tree = PreferenceTree.get();
        Set<String> settingKeys = new HashSet<>();
        for (Setting<?> s : Setting.allLoadedSettings()) {
            settingKeys.add(s.key);
            try {
                Row r = rows.get(s.key);
                PreferenceTree.Node n = r == null ? tree.node(s.key) : null;
                if (r == null && n == null) continue; // no row in this build: not in the editor
                JSONObject m = new JSONObject();
                m.put("type", typeOf(s));
                m.put("available", s.isAvailable());
                m.put("rebootApp", s.rebootApp);
                Object d = s.defaultValue;
                m.put("default", d instanceof Enum<?> e ? e.name() : (d instanceof Boolean || d instanceof Number) ? d : String.valueOf(d));
                if (r != null) {
                    Preference p = r.pref;
                    putText(m, "title", p.getTitle());
                    if (p instanceof TwoStatePreference t) {
                        putText(m, "summaryOn", t.getSummaryOn());
                        putText(m, "summaryOff", t.getSummaryOff());
                    }
                    if (!(p instanceof ListPreference)) putText(m, "summary", p.getSummary());
                    if (p instanceof ListPreference l) putEntries(m, l.getEntries(), l.getEntryValues());
                    putText(m, "screenTitle", r.screen);
                    putText(m, "subScreenTitle", r.sub);
                    // A row drawn by its own Preference class (button order, gesture action,
                    // channel whitelist and the like) edits a structured value a plain text field
                    // would break: flagged "custom", and a tap can open Morphe's own row.
                    if (!(p instanceof TwoStatePreference || p instanceof ListPreference || p instanceof EditTextPreference)
                            && !(s instanceof BooleanSetting)) {
                        m.put("custom", true);
                        ACTIONS.put(s.key, new WeakReference<>(p));
                    }
                } else {
                    putText(m, "title", n.title);
                    if (n.entries == null) putText(m, "summary", n.summary);
                    putEntries(m, n.entries, n.entryValues);
                }
                out.put(s.key, m);
            } catch (Exception ex) {
                Logger.printException(() -> "Visual editor: meta failed for " + s.key, ex);
            }
        }
        addActions(out, settingKeys, actionRows);
        return out;
    }

    // ------------------------------------------------------------------ action rows

    /**
     * Rows of Morphe's list that are not settings but actions: import / export, export debug logs,
     * about and links, and whatever Morphe adds later. They are sent as type "action" (keyless
     * rows get a key of their own for this visit) and a tap in the editor runs the real row
     * (MorpheApp.action), so nothing Morphe's own screen offers goes missing in the editor.
     */
    private static final Map<String, WeakReference<Preference>> ACTIONS = new HashMap<>();

    private static void addActions(JSONObject out, Set<String> settingKeys, List<Row> actionRows) {
        int n = 0;
        for (Row r : actionRows) {
            Preference p = r.pref;
            String key = p.getKey();
            if (key != null && (settingKeys.contains(key) || key.startsWith("morphe_visual_editor_"))) continue;
            if (p instanceof PreferenceGroup g && (g.getPreferenceCount() > 0 || !(p instanceof PreferenceScreen))) continue;
            if (p.getTitle() == null || p.getTitle().length() == 0) continue;
            if (key == null) key = keyFromTitle(p); // the same name the preview's catalogue gives it
            if (key == null || out.has(key)) key = "morphe_action_" + (n++);
            try {
                JSONObject m = new JSONObject();
                m.put("type", "action");
                m.put("available", p.isEnabled());
                putText(m, "title", p.getTitle());
                putText(m, "summary", p.getSummary());
                putText(m, "screenTitle", r.screen);
                putText(m, "subScreenTitle", r.sub);
                out.put(key, m);
                ACTIONS.put(key, new WeakReference<>(p));
            } catch (Exception ex) {
                Logger.printException(() -> "Visual editor: action row failed", ex);
            }
        }
    }

    /** A keyless row is named after its title string, minus "_title" (as extract_catalogue.py does). */
    @Nullable
    private static String keyFromTitle(Preference p) {
        try {
            int id = p.getTitleRes();
            if (id == 0) return null;
            String name = p.getContext().getResources().getResourceEntryName(id);
            return name.endsWith("_title") ? name.substring(0, name.length() - 6) : name;
        } catch (Throwable ex) {
            return null;
        }
    }

    /** Runs an action row as if it was tapped in Morphe's own list. Main thread. */
    static boolean runAction(String key) {
        WeakReference<Preference> ref = ACTIONS.get(key);
        Preference p = ref == null ? null : ref.get();
        if (p == null || !p.isEnabled()) return false;
        PreferenceScreen root = VisualEditorEntry.liveRoot();
        // Preference.performClick(PreferenceScreen): onClick(), the click listener, the fragment's
        // tree click (sub-screens), then the row's intent. Not public, so reached by reflection.
        try {
            Method m = Preference.class.getDeclaredMethod("performClick", PreferenceScreen.class);
            m.setAccessible(true);
            m.invoke(p, root);
            return true;
        } catch (Throwable ignored) {
            // fall through to the public parts of the same sequence
        }
        try {
            Method onClick = Preference.class.getDeclaredMethod("onClick");
            onClick.setAccessible(true);
            onClick.invoke(p);
            if (p.getOnPreferenceClickListener() != null && p.getOnPreferenceClickListener().onPreferenceClick(p)) return true;
            if (p.getIntent() != null) p.getContext().startActivity(p.getIntent());
            return true;
        } catch (Throwable ex) {
            Logger.printException(() -> "Visual editor: could not run " + key, ex);
            return false;
        }
    }

    /** Availability of every loaded setting, as Morphe's own list enables its rows. */
    static JSONObject available() {
        JSONObject out = new JSONObject();
        for (Setting<?> s : Setting.allLoadedSettings()) {
            try {
                out.put(s.key, s.isAvailable());
            } catch (Exception ignored) {
                // a setting whose availability can't be read stays as the page has it
            }
        }
        return out;
    }

    private static final class Row {
        final Preference pref;
        @Nullable final String screen, sub;

        Row(Preference pref, @Nullable String screen, @Nullable String sub) {
            this.pref = pref;
            this.screen = screen;
            this.sub = sub;
        }
    }

    private static void walk(PreferenceGroup group, @Nullable String screen, @Nullable String sub, int depth, Map<String, Row> rows, List<Row> actionRows) {
        for (int i = 0, n = group.getPreferenceCount(); i < n; i++) {
            Preference p = group.getPreference(i);
            String key = p.getKey();
            Row row = new Row(p, screen, sub);
            if (key != null && !rows.containsKey(key)) rows.put(key, row);
            actionRows.add(row);
            if (p instanceof PreferenceGroup g) {
                String t = p.getTitle() == null ? null : p.getTitle().toString();
                boolean isScreen = p instanceof PreferenceScreen;
                walk(g, depth == 0 && isScreen ? t : screen, depth >= 1 && isScreen ? t : sub, isScreen ? depth + 1 : depth, rows, actionRows);
            }
        }
    }

    private static String typeOf(Setting<?> s) {
        if (s instanceof BooleanSetting) return "boolean";
        if (s instanceof IntegerSetting) return "integer";
        if (s instanceof LongSetting) return "long";
        if (s instanceof FloatSetting) return "float";
        if (s instanceof EnumSetting) return "enum";
        if (s instanceof StringSetting) return "string";
        return "other";
    }

    private static void putText(JSONObject m, String name, @Nullable CharSequence v) throws Exception {
        if (v != null) m.put(name, v.toString());
    }

    private static void putEntries(JSONObject m, @Nullable CharSequence[] labels, @Nullable CharSequence[] values) throws Exception {
        if (labels == null || values == null || labels.length != values.length || labels.length == 0) return;
        JSONArray a = new JSONArray();
        for (int i = 0; i < labels.length; i++) {
            a.put(new JSONArray().put(String.valueOf(labels[i])).put(String.valueOf(values[i])));
        }
        m.put("entries", a);
    }
}
