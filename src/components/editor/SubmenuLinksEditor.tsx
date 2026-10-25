import React, { useState } from 'react';
import type { SubmenuLink } from '../../types/appConfig';
import { renderAppIcon } from '../../utils/iconMap';
import { IconPickerModal } from '../IconPickerModal';
import {
  Plus,
  Trash2,
  Globe,
  FileCode,
  Share2,
  Mail,
  ChevronUp,
  ChevronDown,
  FolderTree,
} from 'lucide-react';

interface SubmenuLinksEditorProps {
  links?: SubmenuLink[];
  onChange: (links: SubmenuLink[]) => void;
  accent?: 'indigo' | 'pink';
}

const ACTION_ICON: Record<SubmenuLink['actionType'], string> = {
  website: 'Globe',
  'html-page': 'FileText',
  share: 'Share2',
  contact: 'Mail',
};

function newLink(index: number): SubmenuLink {
  return {
    id: `sm-${Date.now()}-${index}`,
    label: `Submenu Link ${index + 1}`,
    description: '',
    icon: 'Globe',
    actionType: 'website',
    targetUrl: 'https://example.com',
  };
}

/**
 * Editor for a submenu: a single icon on the app's home screen or drawer that
 * opens two or more further destinations.
 */
export const SubmenuLinksEditor: React.FC<SubmenuLinksEditorProps> = ({
  links = [],
  onChange,
  accent = 'indigo',
}) => {
  const [iconPickerIndex, setIconPickerIndex] = useState<number | null>(null);

  const updateLink = (id: string, partial: Partial<SubmenuLink>) => {
    onChange(links.map((link) => (link.id === id ? { ...link, ...partial } : link)));
  };

  const addLink = () => {
    onChange([...links, newLink(links.length)]);
  };

  const removeLink = (id: string) => {
    onChange(links.filter((link) => link.id !== id));
  };

  const moveLink = (index: number, direction: -1 | 1) => {
    const next = [...links];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const activeClass = accent === 'pink' ? 'bg-pink-600 text-white' : 'bg-indigo-600 text-white';
  const borderClass = accent === 'pink' ? 'border-pink-500/50' : 'border-indigo-500/50';

  return (
    <div className={`rounded-xl border ${borderClass} bg-slate-900/50 p-3 space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <FolderTree size={15} className={accent === 'pink' ? 'text-pink-400' : 'text-indigo-400'} />
            <span>Submenu destinations</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {links.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Clicking this one icon opens a list of these places. Add at least two so it truly combines
            sections.
          </p>
        </div>
        <button
          type="button"
          onClick={addLink}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-[11px] font-semibold transition"
        >
          <Plus size={13} />
          Add link
        </button>
      </div>

      {links.length < 2 && (
        <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-2">
          Add at least two destinations — a submenu with one link is just a normal link.
        </p>
      )}

      <div className="space-y-2">
        {links.map((link, index) => (
          <div key={link.id} className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIconPickerIndex(index)}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-700 text-indigo-300 hover:bg-slate-600 transition shrink-0"
                title="Change icon"
              >
                {renderAppIcon(link.icon, 16)}
              </button>
              <input
                type="text"
                value={link.label}
                onChange={(e) => updateLink(link.id, { label: e.target.value })}
                placeholder="Label shown in the submenu"
                className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
              />
              <input
                type="text"
                value={link.badge || ''}
                onChange={(e) => updateLink(link.id, { badge: e.target.value })}
                placeholder="Badge"
                className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs"
              />
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => moveLink(index, -1)}
                  disabled={index === 0}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition"
                  aria-label="Move link up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveLink(index, 1)}
                  disabled={index === links.length - 1}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition"
                  aria-label="Move link down"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => removeLink(link.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition"
                  aria-label="Delete submenu link"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={link.description || ''}
                onChange={(e) => updateLink(link.id, { description: e.target.value })}
                placeholder="Short description (optional)"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
              />

              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: 'website', label: 'Web', icon: Globe },
                  { id: 'html-page', label: 'HTML', icon: FileCode },
                  { id: 'share', label: 'Share', icon: Share2 },
                  { id: 'contact', label: 'Email', icon: Mail },
                ].map((action) => {
                  const ActionIcon = action.icon;
                  const active = link.actionType === action.id;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() =>
                        updateLink(link.id, {
                          actionType: action.id as SubmenuLink['actionType'],
                          icon: ACTION_ICON[action.id as SubmenuLink['actionType']] || link.icon,
                        })
                      }
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition ${
                        active ? activeClass : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <ActionIcon size={12} />
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {(link.actionType === 'website' || link.actionType === 'contact') && (
              <input
                type="text"
                value={link.targetUrl || ''}
                onChange={(e) => updateLink(link.id, { targetUrl: e.target.value })}
                placeholder={
                  link.actionType === 'website'
                    ? 'https://example.com/page'
                    : 'mailto:support@example.com'
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono"
              />
            )}

            {link.actionType === 'html-page' && (
              <textarea
                rows={3}
                value={link.targetHtml || ''}
                onChange={(e) => updateLink(link.id, { targetHtml: e.target.value })}
                placeholder="<h2>Offline page</h2><p>Content shown inside the app…</p>"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-hidden"
              />
            )}
          </div>
        ))}
      </div>

      {links.length === 0 && (
        <div className="text-center py-4 border border-dashed border-slate-700 rounded-lg text-[11px] text-slate-500">
          No destinations yet. Click “Add link”.
        </div>
      )}

      {iconPickerIndex !== null && links[iconPickerIndex] && (
        <IconPickerModal
          isOpen={true}
          currentIcon={links[iconPickerIndex].icon}
          onSelect={(icon) => {
            const link = links[iconPickerIndex];
            if (link) updateLink(link.id, { icon });
          }}
          onClose={() => setIconPickerIndex(null)}
          title="Choose Submenu Link Icon"
        />
      )}
    </div>
  );
};
