import React, { useState, useMemo } from 'react';
import { Folder, FolderOpen, FileCode, ChevronDown, ChevronRight } from 'lucide-react';

function buildTree(files) {
  const root = { name: 'root', isFolder: true, children: {} };
  files.forEach(file => {
    const parts = file.path.split('/');
    let current = root;
    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          isFolder: !isLast,
          path: isLast ? file.path : null,
          language: isLast ? file.language : null,
          children: isLast ? null : {}
        };
      }
      if (!isLast) current = current.children[part];
    });
  });
  return root;
}

function TreeNode({ node, onSelectFile, activeFilePath }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!node.isFolder) {
    const isActive = node.path === activeFilePath;
    return (
      <div
        onClick={() => onSelectFile(node.path, node.language)}
        className={`
          flex items-center gap-2 py-1.5 px-3 cursor-pointer rounded-md text-[13px] transition-all select-none
          ${isActive 
            ? 'bg-[#8b5cf6]/10 text-[#a78bfa] font-semibold border-l-2 border-[#8b5cf6] pl-2' 
            : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
          }
        `}
      >
        <FileCode size={13} className={isActive ? 'text-[#a78bfa]' : 'text-outline-variant'} />
        <span className="truncate">{node.name}</span>
      </div>
    );
  }

  const sortedChildren = useMemo(() =>
    Object.values(node.children).sort((a, b) =>
      (b.isFolder - a.isFolder) || a.name.localeCompare(b.name)
    ), [node.children]);

  return (
    <div className="space-y-0.5 select-none">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 py-1 px-1.5 cursor-pointer rounded-md text-[13px] font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
      >
        {isOpen ? <ChevronDown size={13} className="text-outline" /> : <ChevronRight size={13} className="text-outline" />}
        {isOpen ? (
          <FolderOpen size={13} className="text-[#a78bfa] fill-[#a78bfa]/10" />
        ) : (
          <Folder size={13} className="text-outline fill-outline/5" />
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {isOpen && (
        <div className="border-l border-outline-variant/30 ml-[11px] pl-2 space-y-0.5">
          {sortedChildren.map(child => (
            <TreeNode 
              key={child.name} 
              node={child} 
              onSelectFile={onSelectFile} 
              activeFilePath={activeFilePath} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ files, onSelectFile, activeFilePath }) {
  const tree = useMemo(() => buildTree(files || []), [files]);

  if (!files || files.length === 0) {
    return (
      <div className="p-4 text-outline-variant text-[12px] text-center select-none">
        No files found.
      </div>
    );
  }

  const sortedRoot = Object.values(tree.children).sort((a, b) =>
    (b.isFolder - a.isFolder) || a.name.localeCompare(b.name)
  );

  return (
    <div className="overflow-y-auto h-full p-2 space-y-1.5 custom-scrollbar">
      {sortedRoot.map(child => (
        <TreeNode 
          key={child.name} 
          node={child} 
          onSelectFile={onSelectFile} 
          activeFilePath={activeFilePath} 
        />
      ))}
    </div>
  );
}