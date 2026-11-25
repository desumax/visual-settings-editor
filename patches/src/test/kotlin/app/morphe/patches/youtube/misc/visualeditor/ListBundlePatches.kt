package app.morphe.patches.youtube.misc.visualeditor

import app.morphe.patcher.patch.loadPatchesFromJar
import java.io.File
import java.util.zip.ZipFile
import kotlin.system.exitProcess

/** Prints the patches and extensions of a built bundle; fails if it isn't exactly the editor patch. */
fun main(args: Array<String>) {
    val file = File(args[0])
    val patches = loadPatchesFromJar(setOf(file))
    patches.forEach { println("patch: ${it.name} (default=${it.default})") }
    ZipFile(file).use { zip ->
        zip.entries().asSequence().filter { it.name.endsWith(".mpe") }.forEach { println("extension: ${it.name} ${it.size} bytes") }
        if (zip.getEntry("extensions/visualeditor.mpe") == null) {
            println("ERROR: extensions/visualeditor.mpe missing"); exitProcess(1)
        }
    }
    if (patches.map { it.name } != listOf("Visual settings editor")) {
        println("ERROR: expected exactly the Visual settings editor patch"); exitProcess(1)
    }
    println("OK: ${file.name} (${file.length()} bytes)")
}
