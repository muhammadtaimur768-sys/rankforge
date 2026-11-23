import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { fixTrackedUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

type Variant = "chat" | "article" | "preview" | "site";

function isExternal(href?: string) {
  return !!href && /^(https?:)?\/\//i.test(href);
}

function buildComponents(variant: Variant): Components {
  return {
    a({ href: rawHref, children, node: _node, ...props }) {
      void _node;
      const href = rawHref ? fixTrackedUrl(rawHref) : rawHref;
      const external = isExternal(href);
      // Article bodies carry affiliate links: mark them sponsored for search engines.
      const rel = external ? (variant === "chat" ? "noopener noreferrer" : "sponsored nofollow noopener") : undefined;
      return (
        <a href={href} rel={rel} target={external ? "_blank" : undefined} {...props}>
          {children}
          {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
        </a>
      );
    },
    table({ children, node: _node, ...props }) {
      void _node;
      return (
        <div className="scrollbar-thin -mx-1 my-4 overflow-x-auto px-1">
          <table {...props}>{children}</table>
        </div>
      );
    },
    img({ src, alt, node: _node, ...props }) {
      void _node;
      if (!src) return null;
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" {...props} />;
    },
  };
}

const COMPONENTS: Record<Variant, Components> = {
  chat: buildComponents("chat"),
  article: buildComponents("article"),
  preview: buildComponents("preview"),
  site: buildComponents("site"),
};

const VARIANT_CLASS: Record<Variant, string> = {
  chat: "prose prose-sm prose-rf max-w-none prose-p:my-2 prose-p:leading-6 prose-li:my-0.5 prose-headings:font-medium prose-headings:mt-4 prose-headings:mb-2 prose-pre:my-3 prose-ul:my-2 prose-ol:my-2 text-[15px]",
  preview: "prose prose-rf max-w-none prose-headings:font-medium",
  site: "prose prose-lg prose-site max-w-none prose-p:leading-[1.75] prose-li:leading-[1.7] prose-h3:text-[1.3em] prose-strong:font-semibold",
  article:
    "prose prose-lg prose-rf max-w-none font-serif prose-headings:font-sans prose-headings:font-medium prose-headings:tracking-[-0.01em] prose-h2:mt-12 prose-p:leading-[1.75] prose-li:leading-[1.7] prose-img:rounded-xl",
};

export function Markdown({ children, variant = "chat", className }: { children: string; variant?: Variant; className?: string }) {
  return (
    <div className={cn(VARIANT_CLASS[variant], className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS[variant]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
