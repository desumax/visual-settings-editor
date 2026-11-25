/*
 * Copyright 2026 Morphe.
 * https://github.com/MorpheApp/morphe-patches
 *
 * See the included NOTICE file for GPLv3 Section 7 terms that apply to this code.
 */

package app.morphe.extension.youtube.visualeditor;

import android.app.Activity;
import android.content.Context;
import android.preference.Preference;
import android.preference.PreferenceFragment;
import android.preference.PreferenceScreen;
import android.preference.SwitchPreference;
import android.view.View;

import androidx.annotation.Nullable;

import java.lang.ref.WeakReference;

import app.morphe.extension.shared.Logger;
import app.morphe.extension.shared.Utils;

/**
 * Where the editor joins the regular Morphe settings. The patch calls {@link #onSettingsInitializing}
 * at the start of the Morphe settings fragment's initialize(); the rows are added right after
 * Morphe has built, translated and sorted its own list. Nothing in Morphe's code or resources is changed: one row, the switch,
 * is added to the top of the live list, above About (Max, Nov 24: the old "Open visual editor"
 * row beside it did nothing useful and was removed; the switch opens the editor).
 */
@SuppressWarnings({"deprecation", "unused"})
public final class VisualEditorEntry {
    static final String KEY_SWITCH = "morphe_visual_editor_entry_switch";

    /** The live, translated Morphe settings list. The editor reads titles and entries from it. */
    private static WeakReference<PreferenceScreen> liveRoot = new WeakReference<>(null);
    /** Activity the editor last opened by itself in, so a fragment rebuilt in it doesn't reopen it. */
    private static WeakReference<Activity> autoOpenedIn = new WeakReference<>(null);
    /** Set when this device's WebView is too old for the editor: no more automatic opening until YouTube restarts. */
    static volatile boolean webViewTooOld;
    /**
     * The settings screen, hidden before its first frame when the editor is about to open by itself
     * (Max, Nov 24: the regular menu showed for a moment before the redesign took over). The editor
     * takes it over and shows it again when it closes; if no editor takes it, it is shown again.
     */
    private static WeakReference<View> preHidden = new WeakReference<>(null);

    private VisualEditorEntry() {
    }

    @Nullable
    static PreferenceScreen liveRoot() {
        return liveRoot.get();
    }

    /**
     * Injection point, the first instruction of the settings fragment's initialize(). Runs the
     * real work once initialize() (and the fragment's onCreate) have finished building the list.
     * Must never throw: the regular settings have to keep working regardless.
     */
    public static void onSettingsInitializing(PreferenceFragment fragment) {
        try {
            preHide(fragment.getActivity());
        } catch (Throwable ex) {
            Logger.printException(() -> "Visual editor: could not hide the list before opening", ex);
        }
        try {
            Utils.runOnMainThread(() -> onSettingsCreated(fragment));
        } catch (Throwable ex) {
            Logger.printException(() -> "Visual editor: could not schedule its entry", ex);
        }
    }

    /** Hides the settings screen now, synchronously, when the editor will open by itself in this activity. */
    private static void preHide(@Nullable Activity activity) {
        if (activity == null || activity.isFinishing() || webViewTooOld || autoOpenedIn.get() == activity
                || !VisualEditorSettings.ENABLED.get()) return;
        View content = activity.findViewById(android.R.id.content);
        if (content == null || content.getVisibility() != View.VISIBLE) return;
        content.setVisibility(View.INVISIBLE);
        preHidden = new WeakReference<>(content);
        // never left hidden: shown again if no editor has taken it over by then
        content.postDelayed(VisualEditorEntry::restorePreHidden, 4000);
    }

    /** The editor takes the hidden screen over (it shows it again when it closes). */
    @Nullable
    static View takePreHidden() {
        View v = preHidden.get();
        preHidden = new WeakReference<>(null);
        return v;
    }

    static void restorePreHidden() {
        View v = takePreHidden();
        if (v != null) v.setVisibility(View.VISIBLE);
    }

    static void onSettingsCreated(PreferenceFragment fragment) {
        try {
            onSettingsCreatedInner(fragment);
        } finally {
            restorePreHidden(); // the editor did not open (or failed): the regular list shows
        }
    }

    private static void onSettingsCreatedInner(PreferenceFragment fragment) {
        try {
            PreferenceScreen root = fragment.getPreferenceScreen();
            if (root == null) return;
            liveRoot = new WeakReference<>(root);
            if (root.findPreference(KEY_SWITCH) != null) return; // initialize() ran again

            Context context = root.getContext();
            int top = Integer.MAX_VALUE;
            Preference model = null;
            for (int i = 0, n = root.getPreferenceCount(); i < n; i++) {
                Preference p = root.getPreference(i);
                if (p.getOrder() < top) {
                    top = p.getOrder();
                    model = p;
                }
            }
            if (top == Integer.MAX_VALUE) top = 0;

            SwitchPreference toggle = new EntrySwitch(context);
            toggle.setKey(KEY_SWITCH);
            toggle.setPersistent(false);
            toggle.setTitle("Visual settings editor");
            toggle.setSummaryOn("On: settings open in the visual editor");
            toggle.setSummaryOff("Off: settings open as the regular list");
            toggle.setChecked(VisualEditorSettings.ENABLED.get());
            toggle.setOrder(top - 1);

            if (model != null) {
                // Same row look as the entry it now sits above (icon layout or not).
                // Same row as About: EntrySwitch adds the switch beside it when that row has no
                // widget frame (test 3 showed no switch; borrowing a switch row misaligned it).
                toggle.setLayoutResource(model.getLayoutResource());
                if (model.getIcon() != null) toggle.setIcon(model.getIcon());
            }

            toggle.setOnPreferenceChangeListener((p, value) -> {
                boolean on = Boolean.TRUE.equals(value);
                VisualEditorSettings.ENABLED.save(on);
                if (on) show(fragment.getActivity());
                return true;
            });

            root.addPreference(toggle);

            Activity activity = fragment.getActivity();
            if (VisualEditorSettings.ENABLED.get() && !webViewTooOld && activity != null && autoOpenedIn.get() != activity) {
                autoOpenedIn = new WeakReference<>(activity);
                // Already posted after onCreate, so closing the editor lands on the settings list.
                show(activity);
            }
        } catch (Throwable ex) {
            Logger.printException(() -> "Visual editor: could not add its entry", ex);
        }
    }

    /**
     * A switch row in any row layout. Morphe's icon rows have no widget frame, so when the row
     * has none the switch is put at its end, with the id SwitchPreference binds to.
     */
    static final class EntrySwitch extends SwitchPreference {
        EntrySwitch(Context context) {
            super(context);
        }

        @Override
        protected android.view.View onCreateView(android.view.ViewGroup parent) {
            android.view.View row = super.onCreateView(parent);
            try {
                if (row.findViewById(android.R.id.widget_frame) != null) return row;
                int id = android.content.res.Resources.getSystem().getIdentifier("switch_widget", "id", "android");
                if (id == 0) return row;
                Context c = getContext();
                android.widget.LinearLayout box = new android.widget.LinearLayout(c);
                box.setOrientation(android.widget.LinearLayout.HORIZONTAL);
                box.setGravity(android.view.Gravity.CENTER_VERTICAL);
                box.setLayoutParams(new android.widget.AbsListView.LayoutParams(
                        android.view.ViewGroup.LayoutParams.MATCH_PARENT, android.view.ViewGroup.LayoutParams.WRAP_CONTENT));
                box.setMinimumHeight(row.getMinimumHeight());
                box.addView(row, new android.widget.LinearLayout.LayoutParams(0,
                        android.view.ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
                android.widget.Switch sw = new android.widget.Switch(c);
                sw.setId(id);
                sw.setFocusable(false);
                sw.setClickable(false);
                android.widget.LinearLayout.LayoutParams lp = new android.widget.LinearLayout.LayoutParams(
                        android.view.ViewGroup.LayoutParams.WRAP_CONTENT, android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
                lp.setMarginEnd((int) (16 * c.getResources().getDisplayMetrics().density));
                box.addView(sw, lp);
                return box;
            } catch (Throwable ex) {
                Logger.printException(() -> "Visual editor: could not add the entry switch", ex);
                return row;
            }
        }
    }

    /** Updates the switch after the editor changed its own on setting. */
    static void syncRows() {
        try {
            PreferenceScreen root = liveRoot.get();
            if (root == null) return;
            boolean on = VisualEditorSettings.ENABLED.get();
            Preference sw = root.findPreference(KEY_SWITCH);
            if (sw instanceof SwitchPreference toggle) toggle.setChecked(on);
        } catch (Throwable ex) {
            Logger.printException(() -> "Visual editor: could not update its rows", ex);
        }
    }

    static final String UNSUPPORTED = "Redesign unsupported on this device";
    private static WeakReference<Activity> unsupportedShownIn = new WeakReference<>(null);

    /**
     * Says why the regular settings list opened instead of the redesign. Every fallback path calls
     * it (no WebView, the WebView failing to start or load, a WebView too old for the page); it
     * shows once per visit to Morphe settings.
     */
    static void unsupported(@Nullable Activity activity) {
        if (activity != null && unsupportedShownIn.get() == activity) return;
        unsupportedShownIn = new WeakReference<>(activity);
        Utils.showToastShort(UNSUPPORTED);
    }

    static void show(@Nullable Activity activity) {
        if (activity == null || activity.isFinishing()) return;
        // Fail safe: if anything in the editor goes wrong on this YouTube or Morphe build, the
        // regular Morphe settings are still right there and nothing else is affected.
        try {
            if (WebEditorDialog.available()) {
                try {
                    new WebEditorDialog(activity).show();
                    return;
                } catch (Throwable ex) {
                    Logger.printException(() -> "Visual editor: WebView editor failed, showing the regular list", ex);
                }
            }
            unsupported(activity); // no WebView, or it failed to start: the regular Morphe list stays
        } catch (Throwable ex) {
            Logger.printException(() -> "Visual editor could not open", ex);
            unsupported(activity);
        }
    }
}
