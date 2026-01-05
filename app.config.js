export default{
  "expo": {
    "name": "Study Tracker Plus",
    "slug": "StudyJournalProMobile",
    "version": "1.1.2",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "primaryColor": "#ffffff",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "bundleIdentifier": "com.studyjournalpromobile",
      "buildNumber": "1.0.6",
      "supportsTablet": true,
      "infoPlist": {
        "NSUserTrackingUsageDescription": "Tracking permission is used to deliver relevant ads and support app sustainability.",
        "ITSAppUsesNonExemptEncryption": false,
        "CFBundleLocalizations": ["en", "tr", "es", "ar"],
        "CFBundleDevelopmentRegion": "en"
      },
      "locales": {
        "en": "./locales/en.json",
        "tr": "./locales/tr.json",
        "es": "./locales/es.json",
        "ar": "./locales/ar.json"
      }
    },
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": process.env.ADMOB_ANDROID_APP_ID,
          "iosAppId":process.env.ADMOB_IOS_APP_ID
        }
      ],
      "react-native-iap",
      [
        "expo-build-properties",
        {
          "android": {
            "kotlinVersion": "2.1.20"
          }
        }
      ],
      [
        "expo-notifications",
        {
          "mode": "production"
        }
      ],
      [
        "./app.plugin.js",
        {
          "mode": "adjustResize"
        }
      ],
      "expo-localization",
      "expo-sqlite",
      "expo-tracking-transparency"
    ],
    "android": {
      "package": "com.studyjournalpromobile",
      "adaptiveIcon": {
        "foregroundImage": "./assets/icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true,
      "permissions": [
        "com.google.android.gms.permission.AD_ID"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "dc7a0578-d2b5-4c01-be50-36eff3a8c909"
      },
      "iap": {
        "products": {
          "android": [
            "premium_lifetime",
            "premium_lifetime"
          ],
          "ios": [
            "lifetime_premium",
            "lifetime_premium"
          ]
        },
        "subscriptions": {
          "android": {
            "monthly": {
              "sku": "study_journal_pro",
              "basePlanId": "monthly-plan"
            },
            "yearly": {
              "sku": "study_journal_pro",
              "basePlanId": "yearly-plan"
            }
          },
          "ios": {
            "monthly": {
              "sku": "monthly_premium"
            },
            "yearly": {
              "sku": "yearly_premium"
            }
          }
        }
      }
    },
    "owner": "orhanuzl"
  }
}
