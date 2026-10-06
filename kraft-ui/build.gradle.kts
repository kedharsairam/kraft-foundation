plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.plugin.compose")
}

group = "com.kraft"

android {
    namespace = "com.kraft.ui"
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

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2026.09.00"))
    api("androidx.compose.ui:ui")
    api("androidx.compose.ui:ui-graphics")
    api("androidx.compose.foundation:foundation")
    api("androidx.compose.material3:material3")
    api("androidx.compose.material:material-icons-core")
    api("androidx.compose.material:material-icons-extended")
    api("androidx.activity:activity-compose:1.13.0")
    api("androidx.lifecycle:lifecycle-runtime-compose:2.11.0")

    // The foundation's own rule 3: "Foundation carries its own tests. Shared code is verified
    // code." There were none until September 2026, and an untested shared library is a large
    // part of why eight apps preferred to write their own theme -- if adopting it meant
    // trusting tokens nobody had checked, not adopting it was the rational choice.
    //
    // These tests are not coverage for its own sake. They are the portfolio's guarantee that a
    // token change is a deliberate act: a test asserting the type scale matches Apple's HIG
    // fails the moment someone adjusts a font size, and rule `build.library-has-tests` fails if
    // this file is deleted.
    testImplementation("junit:junit:4.13.2")
}
