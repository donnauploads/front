"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { ProfileSubPage } from "@/components/profile/ProfileSubPage"
import { ChatSupportModal } from "@/components/support/ChatSupportModal"

export default function HelpCenterPage() {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <ProfileSubPage
      title="Help Center"
      subtitle="Get answers fast or chat with our team."
    >
      <div className="actions-bar" style={{ gridTemplateColumns: "1fr" }}>
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="action-btn"
        >
          <span className="action-ic">
            <MessageCircle aria-hidden />
          </span>
          <span className="al">Chat with us</span>
        </button>
      </div>

      <ChatSupportModal open={chatOpen} onClose={() => setChatOpen(false)} />
    </ProfileSubPage>
  )
}
