"use client"

import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import { useEffect } from "react"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading2,
  Quote,
  Undo,
  Redo,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Lightweight Tiptap rich-text editor used by the admin Mail composer +
 * reply box. Emits sanitized-on-the-server HTML via `onChange`. Images can
 * be inserted by URL (uploaded attachments are handled separately as real
 * email attachments).
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 180,
  className,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  className?: string
}) {
  const editor = useEditor({
    // Next.js SSR: avoid rendering during the server pass to prevent
    // hydration mismatches (Tiptap v3 requirement).
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-3 py-2.5",
        style: `min-height:${minHeight}px`,
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML()
      onChange(html === "<p></p>" ? "" : html)
    },
  })

  // Keep the editor in sync when the parent resets `value` (e.g. after send).
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const next = value || "<p></p>"
    if (current !== next && (value === "" || value == null)) {
      editor.commands.setContent(next, { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  if (!editor) {
    return (
      <div
        className={cn("rounded-lg border border-slate-200 bg-white", className)}
        style={{ minHeight: minHeight + 40 }}
      />
    )
  }

  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white", className)}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const Btn = ({
    onClick,
    active,
    label,
    children,
  }: {
    onClick: () => void
    active?: boolean
    label: string
    children: React.ReactNode
  }) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100",
        active && "bg-slate-900 text-white hover:bg-slate-900",
      )}
    >
      {children}
    </button>
  )

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 px-1.5 py-1">
      <Btn label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </Btn>
      <Btn label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </Btn>
      <Btn label="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </Btn>
      <span className="mx-1 h-5 w-px bg-slate-200" />
      <Btn label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </Btn>
      <Btn label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </Btn>
      <Btn label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </Btn>
      <span className="mx-1 h-5 w-px bg-slate-200" />
      <Btn
        label="Link"
        active={editor.isActive("link")}
        onClick={() => {
          const prev = editor.getAttributes("link").href as string | undefined
          const url = window.prompt("Link URL", prev ?? "https://")
          if (url === null) return
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run()
            return
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
        }}
      >
        <LinkIcon className="h-4 w-4" />
      </Btn>
      <Btn
        label="Image by URL"
        onClick={() => {
          const url = window.prompt("Image URL")
          if (url) editor.chain().focus().setImage({ src: url }).run()
        }}
      >
        <ImageIcon className="h-4 w-4" />
      </Btn>
      <span className="mx-1 h-5 w-px bg-slate-200" />
      <Btn label="Undo" onClick={() => editor.chain().focus().undo().run()}>
        <Undo className="h-4 w-4" />
      </Btn>
      <Btn label="Redo" onClick={() => editor.chain().focus().redo().run()}>
        <Redo className="h-4 w-4" />
      </Btn>
    </div>
  )
}
