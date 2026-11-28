/*
 * Copyright 2026 Morphe.
 * https://github.com/MorpheApp/morphe-patches
 *
 * See the included NOTICE file for GPLv3 Section 7 terms that apply to this code.
 */

package app.morphe.extension.youtube.visualeditor;

import android.app.AlertDialog;
import android.content.Context;

import androidx.annotation.Nullable;

import app.morphe.extension.shared.Logger;
import app.morphe.extension.shared.settings.Setting;

/**
 * Reads and writes the real Morphe settings through the same Setting API the regular screens use.
 * The editor keeps no copy of any setting, so whatever is changed here is exactly what the regular
 * Morphe screens would have changed, and every patch keeps reading its own setting as before.
 */
final class SettingsBridge {

    @Nullable
    static Setting<?> setting(@Nullable String key) {
        return key == null ? null : Setting.getSettingFromPath(key);
    }

    /**
     * Saves a value as a string, the way the regular screens save list and text preferences.
     * Settings that ask the user to confirm a change ask here too, before saving.
     *
     * @param after Run once the value is saved, or the confirmation is declined.
     */
    void save(Context context, String key, String newValue, Runnable after) {
        Setting<?> s = setting(key);
        if (s == null || newValue.equals(String.valueOf(s.get()))) {
            after.run();
            return;
        }
        // Morphe has this setting switched off right now (its parent is off, or it is not supported
        // here): its own list would not let it change, so neither does the editor. The page gets
        // the kept value back.
        if (!s.isAvailable()) {
            after.run();
            return;
        }
        if (s.userDialogMessage != null && !newValue.equals(String.valueOf(s.defaultValue))) {
            try {
                new AlertDialog.Builder(context)
                        .setMessage(s.userDialogMessage.toString())
                        .setPositiveButton(android.R.string.ok, (d, w) -> {
                            saveConfirmed(s, newValue);
                            after.run();
                        })
                        .setNegativeButton(android.R.string.cancel, (d, w) -> after.run())
                        .setOnCancelListener(d -> after.run())
                        .show();
                return;
            } catch (Exception ex) {
                Logger.printException(() -> "Visual editor: confirmation dialog failed", ex);
            }
        }
        saveConfirmed(s, newValue);
        after.run();
    }

    /**
     * Saves a value whose confirmation the page has already shown, in its own design, with the same
     * text ({@code confirm} in the metadata). {@link #save} keeps asking for every other caller.
     */
    void saveConfirmedByPage(String key, String newValue, Runnable after) {
        Setting<?> s = setting(key);
        if (s != null && !newValue.equals(String.valueOf(s.get())) && s.isAvailable()) saveConfirmed(s, newValue);
        after.run();
    }

    private void saveConfirmed(Setting<?> s, String newValue) {
        try {
            PendingChanges.beforeSave(s, String.valueOf(s.get()));
            s.saveFromString(newValue);
            PendingChanges.afterSave(s);
            // No AbstractPreferenceFragment.setRestartNeeded() here: Morphe then forces a restart
            // when its settings close, which would undo "Save for later". The editor asks itself.
        } catch (RuntimeException | LinkageError ex) {
            // LinkageError: an older Morphe build without a method this one calls (saveFromString)
            Logger.printException(() -> "Visual editor: could not save " + s.key + ": " + newValue, ex);
        }
    }
}
