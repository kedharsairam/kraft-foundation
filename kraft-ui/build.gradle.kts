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
}
