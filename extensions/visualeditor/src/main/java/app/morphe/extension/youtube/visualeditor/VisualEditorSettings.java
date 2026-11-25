/*
 * Copyright 2026 Morphe.
 * https://github.com/MorpheApp/morphe-patches
 *
 * See the included NOTICE file for GPLv3 Section 7 terms that apply to this code.
 */

package app.morphe.extension.youtube.visualeditor;

import static java.lang.Boolean.FALSE;

import app.morphe.extension.shared.settings.BooleanSetting;

/**
 * The editor's own settings. They live in the editor's package, so Settings.java (which the
 * developer edits all the time) is left untouched. Their keys start with morphe_visual_editor_,
 * which no Morphe setting uses.
 */
public final class VisualEditorSettings {
    /** Opening Morphe settings opens the editor first. The regular list is one tap back. */
    // Left out of import / export (the last argument): an import resets every exported setting its
    // text does not name, which would switch the redesign off from inside the redesign.
    public static final BooleanSetting ENABLED = new BooleanSetting("morphe_visual_editor_enabled", FALSE, false, false);
    // The editor's own choices (layout, list design, glass) are kept by the web page itself.

    private VisualEditorSettings() {
    }
}
