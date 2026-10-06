// A new Kraft app starts compliant, which is cheaper than bringing one into compliance later.
//
// Copy this directory, change the three values marked CHANGE, and the app already consumes the
// shared foundation, declares the standard it targets, and has a workflow that runs the gate.
// The alternative — retrofitting all of this after the app is written — is what left eight of
// nine apps looking like unrelated products.
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

// CHANGE: the application id. Must be lowercase, no underscores.
rootProject.name = "newkraft-app"
include(":app")

// The foundation. Required: `build.uses-shared-library` fails the build without it.
includeBuild("../kraft-foundation") {
    dependencySubstitution {
        substitute(module("com.kraft:kraft-ui")).using(project(":kraft-ui"))
        substitute(module("com.kraft:kraft-core")).using(project(":kraft-core"))
    }
}
