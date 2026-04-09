import React from "react";

// Generic file-tree sidebar (Phase A–B).  No VS Code / Microsoft logos.
// Shows a plausible project structure to establish "dark IDE" context.

const C = {
  headerBg:     "#252526",
  headerText:   "#bbbbbb",
  headerLabel:  "#8a8a8e",
  folderText:   "#cccccc",
  fileText:     "#cccccc",
  fileTextDim:  "#9a9a9e",
  activeBg:     "rgba(255,255,255,0.06)",
  hoverBg:      "rgba(255,255,255,0.04)",
  iconFolder:   "#dcb67a",
  iconTS:       "#3178c6",
  iconCSS:      "#42a5f5",
  iconJSON:     "#cbcb41",
  iconMD:       "#519aba",
};

type FileItem = {
  name: string;
  type: "folder" | "file";
  ext?: string;
  depth: number;
  open?: boolean;
  active?: boolean;
};

const TREE: FileItem[] = [
  { name: "my-app",         type: "folder", depth: 0, open: true  },
  { name: "src",            type: "folder", depth: 1, open: true  },
  { name: "components",     type: "folder", depth: 2, open: true  },
  { name: "Dashboard.tsx",  type: "file",   depth: 3, ext: "tsx", active: true },
  { name: "Sidebar.tsx",    type: "file",   depth: 3, ext: "tsx" },
  { name: "Header.tsx",     type: "file",   depth: 3, ext: "tsx" },
  { name: "hooks",          type: "folder", depth: 2 },
  { name: "useData.ts",     type: "file",   depth: 3, ext: "ts"  },
  { name: "services",       type: "folder", depth: 2, open: true  },
  { name: "api.ts",         type: "file",   depth: 3, ext: "ts"  },
  { name: "index.tsx",      type: "file",   depth: 2, ext: "tsx" },
  { name: "styles",         type: "folder", depth: 1 },
  { name: "globals.css",    type: "file",   depth: 2, ext: "css" },
  { name: "package.json",   type: "file",   depth: 1, ext: "json" },
  { name: "README.md",      type: "file",   depth: 1, ext: "md"  },
];

const INDENT = 12;
const ROW_H  = 24;

function extColor(ext?: string): string {
  if (!ext) return C.fileTextDim;
  const map: Record<string, string> = {
    tsx: C.iconTS, ts: C.iconTS,
    css: C.iconCSS, json: C.iconJSON, md: C.iconMD,
  };
  return map[ext] ?? C.fileTextDim;
}

function FolderArrow({ open }: { open?: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        marginRight: 4,
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        color: C.headerLabel,
        fontSize: 10,
        lineHeight: 1,
      }}
    >
      ▶
    </span>
  );
}

function FileIcon({ ext, folder }: { ext?: string; folder?: boolean }) {
  if (folder) {
    return (
      <span style={{ marginRight: 5, fontSize: 13, color: C.iconFolder }}>▤</span>
    );
  }
  const color = extColor(ext);
  return (
    <span style={{ marginRight: 5, fontSize: 12, color, fontFamily: "monospace" }}>
      {ext === "tsx" || ext === "ts" ? "TS" : ext === "css" ? "CS" : ext === "json" ? "{}" : "≡"}
    </span>
  );
}

export const FileTreeSidebar: React.FC<{ slot?: string }> = () => (
  <div style={{ width: "100%", height: "100%", background: C.headerBg, fontSize: 13, lineHeight: "1.4" }}>
    {/* Panel header */}
    <div
      style={{
        padding: "10px 12px 6px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.9,
        color: C.headerLabel,
        textTransform: "uppercase",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      Explorer
    </div>

    {/* Project root row */}
    <div
      style={{
        padding: "5px 12px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.7,
        color: C.headerLabel,
        textTransform: "uppercase",
        display: "flex",
        alignItems: "center",
      }}
    >
      <FolderArrow open />
      MY-APP
    </div>

    {/* File tree rows */}
    {TREE.map((item, i) => (
      <div
        key={i}
        style={{
          display: "flex",
          alignItems: "center",
          height: ROW_H,
          paddingLeft: 12 + item.depth * INDENT,
          paddingRight: 8,
          background: item.active ? C.activeBg : "transparent",
          color: item.type === "folder" ? C.folderText : C.fileText,
          cursor: "default",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {item.type === "folder" ? (
          <>
            <FolderArrow open={item.open} />
            <FileIcon folder />
          </>
        ) : (
          <FileIcon ext={item.ext} />
        )}
        <span style={{ fontSize: 13, color: item.active ? "#ffffff" : item.type === "file" ? C.fileTextDim : C.folderText }}>
          {item.name}
        </span>
      </div>
    ))}
  </div>
);
