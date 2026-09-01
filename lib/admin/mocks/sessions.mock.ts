import type { AdminSession } from "@/lib/store"

function minsAgoIso(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString()
}

export const demoAdminSessions: AdminSession[] = [
  // Maya — currently logged in
  { id: "sess_001", userId: "u_001", deviceName: "iPhone 15 Pro", os: "iOS 18.2", browser: "Safari", ip: "73.92.18.41", location: "Brooklyn, NY", lastActiveAt: minsAgoIso(2), current: true },
  { id: "sess_002", userId: "u_001", deviceName: "MacBook Pro", os: "macOS 14", browser: "Chrome", ip: "73.92.18.41", location: "Brooklyn, NY", lastActiveAt: minsAgoIso(180), current: false },

  // Jamal
  { id: "sess_010", userId: "u_002", deviceName: "Pixel 8", os: "Android 14", browser: "Chrome", ip: "98.115.220.7", location: "Manhattan, NY", lastActiveAt: minsAgoIso(8), current: true },
  { id: "sess_011", userId: "u_002", deviceName: "Windows PC", os: "Windows 11", browser: "Edge", ip: "98.115.220.7", location: "Manhattan, NY", lastActiveAt: minsAgoIso(540), current: false },

  // Priya
  { id: "sess_020", userId: "u_003", deviceName: "iPad Air", os: "iPadOS 17", browser: "Safari", ip: "24.55.118.12", location: "San Francisco, CA", lastActiveAt: minsAgoIso(30), current: true },

  // Theo
  { id: "sess_030", userId: "u_004", deviceName: "iPhone 14", os: "iOS 17.6", browser: "Safari", ip: "67.165.42.88", location: "Chicago, IL", lastActiveAt: minsAgoIso(95), current: true },

  // Lena
  { id: "sess_040", userId: "u_005", deviceName: "Galaxy S23", os: "Android 14", browser: "Chrome", ip: "50.190.55.221", location: "Portland, OR", lastActiveAt: minsAgoIso(220), current: true },

  // Alex (active customer)
  { id: "sess_050", userId: "u_006", deviceName: "iPhone 15", os: "iOS 18", browser: "Safari", ip: "73.92.18.41", location: "Brooklyn, NY", lastActiveAt: minsAgoIso(1), current: true },
  { id: "sess_051", userId: "u_006", deviceName: "MacBook Air", os: "macOS 14", browser: "Chrome", ip: "73.92.18.41", location: "Brooklyn, NY", lastActiveAt: minsAgoIso(60), current: false },

  // Sam — single session
  { id: "sess_060", userId: "u_007", deviceName: "iPhone 13 mini", os: "iOS 17", browser: "Safari", ip: "108.20.55.41", location: "Oakland, CA", lastActiveAt: minsAgoIso(220), current: true },

  // Mateo — suspended; legacy session
  { id: "sess_070", userId: "u_010", deviceName: "iPhone 12", os: "iOS 17", browser: "Safari", ip: "152.42.180.20", location: "Brooklyn, NY", lastActiveAt: minsAgoIso(14 * 24 * 60), revokedAt: minsAgoIso(14 * 24 * 60 - 10), current: false },
]
