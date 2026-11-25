import com.android.build.api.dsl.ApplicationExtension
import com.android.build.api.variant.ApplicationAndroidComponentsExtension
import javax.inject.Inject

extension {
    name = "extensions/visualeditor.mpe"
}

// The editor's own extension. It holds only the editor's classes: the Morphe classes it uses
// (Setting, Utils, Logger) are compile-only and come from the official Morphe Patches extensions
// already merged into the app.
dependencies {
    compileOnly(libs.annotation)
    compileOnly(libs.morphe.extensions.library)
}

configure<ApplicationExtension> {
    namespace = "app.morphe.extension.youtube.visualeditor"

    defaultConfig {
        minSdk = 26
    }
}

// The designed editor (editor/web plus the in-app scripts in editor/app), packed into
// WebAssets.java, which the WebView loads. Generated on every build, never committed.
abstract class GenerateWebAssets : DefaultTask() {
    @get:InputDirectory
    abstract val web: DirectoryProperty

    @get:InputDirectory
    abstract val app: DirectoryProperty

    @get:Input
    abstract val python: Property<String>

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @get:Inject
    abstract val execOperations: ExecOperations

    @TaskAction
    fun generate() {
        execOperations.exec {
            commandLine(
                python.get(),
                app.file("build_web_assets.py").get().asFile.absolutePath,
                outputDir.get().asFile.absolutePath,
            )
        }
    }
}

val editorDir = rootProject.layout.projectDirectory.dir("editor")
val generateWebAssets = tasks.register<GenerateWebAssets>("generateWebAssets") {
    description = "Packs the web editor into WebAssets.java"
    web.set(editorDir.dir("web"))
    app.set(editorDir.dir("app"))
    python.set(if (System.getProperty("os.name").lowercase().contains("windows")) "python" else "python3")
}

configure<ApplicationAndroidComponentsExtension> {
    onVariants { variant ->
        variant.sources.java?.addGeneratedSourceDirectory(generateWebAssets, GenerateWebAssets::outputDir)
    }
}
