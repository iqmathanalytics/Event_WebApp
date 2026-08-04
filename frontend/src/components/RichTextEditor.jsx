import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { isRichTextEmpty, plainTextFromHtml, sanitizeRichTextHtml, toEditorHtml } from "../utils/richText";

function ToolbarButton({ active, disabled, onClick, children, label }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick?.();
      }}
      className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
        active ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

/**
 * Controlled rich-text editor for event descriptions.
 * Emits sanitized HTML (or "" when empty). Accepts legacy plain text.
 */
export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Describe the experience, audience, and key details…",
  disabled = false,
  className = ""
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        horizontalRule: false
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank"
        }
      }),
      Placeholder.configure({ placeholder })
    ],
    content: toEditorHtml(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "rich-text-editor__content focus:outline-none"
      }
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const next = isRichTextEmpty(html) ? "" : sanitizeRichTextHtml(html);
      onChange?.(next);
    }
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const nextHtml = toEditorHtml(value);
    const currentHtml = sanitizeRichTextHtml(editor.getHTML());
    const incomingHtml = sanitizeRichTextHtml(nextHtml);
    if (currentHtml === incomingHtml) {
      return;
    }
    const currentPlain = editor.getText().replace(/\s+/g, " ").trim();
    const incomingPlain = plainTextFromHtml(value);
    if (currentPlain === incomingPlain && editor.isFocused) {
      return;
    }
    editor.commands.setContent(nextHtml || "", false);
  }, [value, editor]);

  const setLink = () => {
    if (!editor) {
      return;
    }
    const previous = editor.getAttributes("link").href || "";
    const url = window.prompt("Link URL", previous);
    if (url === null) {
      return;
    }
    const trimmed = String(url || "").trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  };

  return (
    <div
      className={`rich-text-editor overflow-hidden rounded-xl border border-slate-300 bg-white ${
        disabled ? "opacity-70" : ""
      } ${className}`}
    >
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        <ToolbarButton
          label="Bold"
          disabled={disabled || !editor}
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          Bold
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          disabled={disabled || !editor}
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          Italic
        </ToolbarButton>
        <ToolbarButton
          label="Strike"
          disabled={disabled || !editor}
          active={editor?.isActive("strike")}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          Strike
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          disabled={disabled || !editor}
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          disabled={disabled || !editor}
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          label="Heading"
          disabled={disabled || !editor}
          active={editor?.isActive("heading", { level: 3 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          Heading
        </ToolbarButton>
        <ToolbarButton label="Link" disabled={disabled || !editor} active={editor?.isActive("link")} onClick={setLink}>
          Link
        </ToolbarButton>
        <ToolbarButton
          label="Clear formatting"
          disabled={disabled || !editor}
          onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
        >
          Clear
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
