/*
 * Copyright 2026 Morphe.
 * https://github.com/MorpheApp/morphe-patches
 *
 * See the included NOTICE file for GPLv3 Section 7 terms that apply to this code.
 */

package app.morphe.patches.youtube.misc.visualeditor

import app.morphe.patcher.extensions.InstructionExtensions.addInstruction
import app.morphe.patcher.patch.bytecodePatch
import app.morphe.patcher.patch.classDefByOrNull
import app.morphe.patcher.patch.mutableClassDefBy
import app.morphe.patches.youtube.shared.Constants.COMPATIBILITY_YOUTUBE
import java.util.logging.Logger

private const val ENTRY =
    "Lapp/morphe/extension/youtube/visualeditor/VisualEditorEntry;"

private val logger = Logger.getLogger("VisualSettingsEditor")
private fun warn(message: String) = logger.warning(message)

// The Morphe settings screen of the official Morphe Patches (its YouTube extension).
private const val SETTINGS_FRAGMENT =
    "Lapp/morphe/extension/youtube/settings/preference/YouTubePreferenceFragment;"

/**
 * Optional visual front end for the Morphe settings screen, shipped as a bundle of its own that is
 * applied on top of the official Morphe Patches.
 *
 * It is a front end only. It reads the settings list from the same morphe_prefs.xml the regular
 * Morphe screens use, and reads and writes values through the same Setting API. It depends on no
 * patch object of another bundle, adds no resources and edits no other patch: its only change to
 * Morphe's code is one call at the start of the settings fragment's initialize(); the editor's
 * two rows are added above About right after initialize() has built the list.
 *
 * That call is made in finalize, after every patch of every bundle has run, so the official
 * settings extension is already merged no matter in which order the bundles' patches run.
 */
@Suppress("unused")
val visualSettingsEditorPatch = bytecodePatch(
    name = "Visual settings editor",
    description = "Adds an optional visual editor at the top of Morphe settings (test build). " +
        "Needs the Morphe Patches bundle in the same patching run, with at least one patch that adds " +
        "Morphe settings (in Morphe Manager: Expert mode, both bundles selected).",
    // On by default: it is the only patch of this bundle, so selecting the bundle selects it.
    default = true,
) {
    // The official bundle's own YouTube compatibility: app identity, the supported versions and
    // their minimum Android. The standalone builder keeps upstream's Constants.kt for this, so the
    // editor never claims more (or less) than the official patches at the tag it is built against.
    compatibleWith(COMPATIBILITY_YOUTUBE)

    extendWith("extensions/visualeditor.mpe")

    // This patch must never be the reason patching fails. Whatever it can't find on this YouTube
    // build or patch selection (no Morphe settings, a renamed method, a missing class), it logs a
    // warning and leaves the app unchanged; the regular Morphe settings keep working.
    finalize {
        try {
            if (classDefByOrNull(SETTINGS_FRAGMENT) == null) {
                warn(
                    "Morphe settings were not found, so the visual editor was not added. Select the " +
                        "Morphe Patches bundle too (any patch with Morphe settings, for example Hide ads).",
                )
                return@finalize
            }

            val initialize = mutableClassDefBy(SETTINGS_FRAGMENT).methods.firstOrNull { method ->
                method.name == "initialize" && method.parameterTypes.isEmpty() && method.returnType == "V"
            }
            if (initialize == null) {
                warn("Morphe settings changed (initialize() not found), so the visual editor was not added.")
                return@finalize
            }

            // At the very start, where p0 is still the fragment: D8 reuses p0 for other values later in
            // the method, so a call before a return would hand the verifier a wrong type (test 1 crashed
            // on that). The extension posts its work to run once initialize() and onCreate() are done.
            initialize.addInstruction(
                0,
                "invoke-static { p0 }, $ENTRY->onSettingsInitializing(Landroid/preference/PreferenceFragment;)V",
            )
        } catch (ex: Throwable) {
            warn("The visual editor could not be added (${ex.javaClass.simpleName}: ${ex.message}). The app is patched without it.")
        }
    }
}
