/*
 * Copyright 2026 Morphe.
 * https://github.com/MorpheApp/morphe-patches
 *
 * See the included NOTICE file for GPLv3 Section 7 terms that apply to this code.
 */

package app.morphe.extension.youtube.visualeditor;

import android.content.Context;
import android.content.res.Resources;
import android.content.res.XmlResourceParser;

import androidx.annotation.Nullable;

import org.xmlpull.v1.XmlPullParser;

import java.util.HashMap;
import java.util.Map;

import app.morphe.extension.shared.Logger;
import app.morphe.extension.shared.Utils;

/**
 * The rows of res/xml/morphe_prefs.xml, the file the regular Morphe settings screen inflates.
 * LiveSettings reads a row from it when the live list no longer holds that row: a key found here
 * is a row of this build, with its translated title, summary and list entries. Nothing about the
 * settings is copied into this patch, so a setting the developer adds, renames or removes shows
 * up here as it does on the regular screens.
 */
public final class PreferenceTree {

    private static final String ANDROID_NS = "http://schemas.android.com/apk/res/android";

    public static final class Node {
        @Nullable public final String title, summary;
        @Nullable public final CharSequence[] entries, entryValues;

        Node(@Nullable String title, @Nullable String summary,
             @Nullable CharSequence[] entries, @Nullable CharSequence[] entryValues) {
            this.title = title;
            this.summary = summary;
            this.entries = entries;
            this.entryValues = entryValues;
        }
    }

    /** Every row that has a key. */
    private final Map<String, Node> byKey = new HashMap<>();

    private static volatile PreferenceTree instance;

    public static PreferenceTree get() {
        if (instance == null) {
            synchronized (PreferenceTree.class) {
                if (instance == null) instance = load(Utils.getContext());
            }
        }
        return instance;
    }

    @Nullable
    public Node node(String key) {
        return byKey.get(key);
    }

    private static PreferenceTree load(Context context) {
        PreferenceTree tree = new PreferenceTree();
        Resources res = context.getResources();
        // Same resource the settings fragment uses; the icon variants hold the same preferences.
        int id = res.getIdentifier("morphe_prefs", "xml", context.getPackageName());
        if (id == 0) id = res.getIdentifier("morphe_prefs_icons", "xml", context.getPackageName());
        if (id == 0) {
            Logger.printException(() -> "Visual editor: morphe_prefs not found");
            return tree;
        }
        try (XmlResourceParser p = res.getXml(id)) {
            for (int ev = p.getEventType(); ev != XmlPullParser.END_DOCUMENT; ev = p.next()) {
                if (ev != XmlPullParser.START_TAG) continue;
                String key = p.getAttributeValue(ANDROID_NS, "key");
                if (key == null || tree.byKey.containsKey(key)) continue;
                tree.byKey.put(key, new Node(text(res, p, "title"), text(res, p, "summary"),
                        array(res, p, "entries"), array(res, p, "entryValues")));
            }
        } catch (Exception ex) {
            Logger.printException(() -> "Visual editor: could not read morphe_prefs", ex);
        }
        return tree;
    }

    @Nullable
    private static String text(Resources res, XmlResourceParser p, String attr) {
        int rid = p.getAttributeResourceValue(ANDROID_NS, attr, 0);
        if (rid != 0) {
            try { return res.getString(rid); } catch (Resources.NotFoundException ignored) { return null; }
        }
        return p.getAttributeValue(ANDROID_NS, attr);
    }

    @Nullable
    private static CharSequence[] array(Resources res, XmlResourceParser p, String attr) {
        int rid = p.getAttributeResourceValue(ANDROID_NS, attr, 0);
        if (rid == 0) return null;
        try { return res.getTextArray(rid); } catch (Resources.NotFoundException ignored) { return null; }
    }
}
