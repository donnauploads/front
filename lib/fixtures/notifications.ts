export type CarouselSlide = {
  id: string
  eyebrow: string
  title: string
  body: string
  cta: string
  href: string
  // Tailwind gradient class layered over the image as a dark scrim so
  // the white text stays readable.
  gradient: string
  // Background photo (public path). Each slide picks one of /1.jpg…/9.jpg
  // based on theme — friends, paycheck, growth, credit.
  image: string
}

export const carouselSlides: CarouselSlide[] = [
  {
    id: "refer",
    eyebrow: "Limited Offer",
    title: "Get $200 when a friend joins",
    body: "Send your unique invite — they get $100 after their first qualifying direct deposit.",
    cta: "Invite friends",
    href: "/profile",
    gradient: "from-fern/80 to-brand-deep/90",
    image: "/1.jpg",
  },
  {
    id: "early-pay",
    eyebrow: "Early Payday",
    title: "Get paid up to 2 days early",
    body: "Set up direct deposit and unlock SpotMe overdraft up to $200, fee-free.",
    cta: "Set up direct deposit",
    href: "/move",
    gradient: "from-emerald-700/75 to-emerald-950/90",
    image: "/2.jpg",
  },
  {
    id: "savings",
    eyebrow: "New",
    title: "Earn 3.5% APY",
    body: "Move to State Bank+ with a qualifying direct deposit and boost your Savings APY.",
    cta: "Learn more",
    href: "#",
    gradient: "from-teal-700/75 to-emerald-950/90",
    image: "/3.jpg",
  },
  {
    id: "credit",
    eyebrow: "Build Credit",
    title: "Add 70 points on average",
    body: "State Bank Credit Builder reports your on-time spend to all three bureaus. No interest, no fee.",
    cta: "Set it up",
    href: "#",
    gradient: "from-lime-700/75 to-green-950/90",
    image: "/4.jpg",
  },
]

export type NotificationItem = {
  id: string
  title: string
  body: string
  ts: string // human readable for the demo
  unread: boolean
  category: "transaction" | "offer" | "security" | "account"
}

export const demoNotifications: NotificationItem[] = [
  {
    id: "n1",
    title: "Direct deposit landed",
    body: "Acme Co. — $2,148.93 hit your Spending account.",
    ts: "2h ago",
    unread: true,
    category: "transaction",
  },
  {
    id: "n2",
    title: "Get $200 when friends join",
    body: "Invite friends to State Bank and earn together.",
    ts: "Today",
    unread: true,
    category: "offer",
  },
  {
    id: "n3",
    title: "Login from a new device",
    body: "MacBook Pro · Brooklyn, NY · just now. Was this you?",
    ts: "Yesterday",
    unread: true,
    category: "security",
  },
  {
    id: "n4",
    title: "Your statement is ready",
    body: "April Spending statement is available in Documents.",
    ts: "2d",
    unread: false,
    category: "account",
  },
  {
    id: "n5",
    title: "Round-Up saved $4.27",
    body: "Spare change from 6 purchases moved to Savings.",
    ts: "3d",
    unread: false,
    category: "transaction",
  },
]
