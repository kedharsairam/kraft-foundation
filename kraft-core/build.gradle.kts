plugins {
    id("com.android.library")
}

android {
    namespace = "com.kraft.core"
    compileSdk = 37

    defaultConfig {
        minSdk = 26
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }
}

dependencies {
    // Pure Kotlin — no Compose, no Android UI. Usable from any module.
    testImplementation("junit:junit:4.13.2")
}
