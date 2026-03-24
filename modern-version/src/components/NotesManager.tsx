"use client";

import React, { useState, useEffect, useRef } from 'react';

type Priority = 'urgent' | 'high' | 'normal' | 'low';
type NoteType = 'note' | 'todo' | 'reminder';

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

interface Note {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  priority: Priority;
  pinned: boolean;
  color: string;
  tags: string[];
  todos: TodoItem[];
  createdAt: string;
  updatedAt: string;
}

const COLORS = [
  { id: 'white', bg: 'bg-white', border: 'border-slate-200', label: 'Oq' },
  { id: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'Ko\'k' },
  { id: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Sariq' },
  { id: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Yashil' },
  { id: 'rose', bg: 'bg-rose-50', border: 'border-rose-200', label: 'Qizil' },
  { id: 'violet', bg: 'bg-violet-50', border: 'border-violet-200', label: 'Binafsha' },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; icon: string; cls: string }> = {
  urgent: { label: 'Shoshilinch', icon: '🔴', cls: 'bg-red-100 text-red-700' },
  high:   { label: 'Yuqori',      icon: '🟠', cls: 'bg-orange-100 text-orange-700' },
  normal: { label: 'Oddiy',       icon: '🔵', cls: 'bg-blue-100 text-blue-700' },
  low:    { label: 'Past',        icon: '⚪', cls: 'bg-slate-100 text-slate-500' },
};

const TYPE_CONFIG: Record<NoteType, { label: string; icon: string }> = {
  note:     { label: 'Eslatma',   icon: '📝' },
  todo:     { label: 'Vazifalar', icon: '✅' },
  reminder: { label: 'Eslatgich', icon: '🔔' },
};

const genId = () => Math.random().toString(36).slice(2, 11);
const now = () => new Date().toISOString();

const emptyNote = (): Note => ({
  id: genId(),
  title: '',
  content: '',
  type: 'note',
  priority: 'normal',
  pinned: false,
  color: 'white',
  tags: [],
  todos: [],
  createdAt: now(),
  updatedAt: now(),
});

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'hozir';
  if (m < 60) return `${m} daqiqa oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.floor(h / 24);
  return `${d} kun oldin`;
}

/* ─── EDITOR MODAL ─────────────────────────────────────────── */
const NoteEditor = ({
  note,
  onSave,
  onClose,
}: {
  note: Note;
  onSave: (n: Note) => void;
  onClose: () => void;
}) => {
  const [draft, setDraft] = useState<Note>(note);
  const [tagInput, setTagInput] = useState('');
  const [newTodo, setNewTodo] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const update = (fields: Partial<Note>) =>
    setDraft(prev => ({ ...prev, ...fields, updatedAt: now() }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !draft.tags.includes(t)) {
      update({ tags: [...draft.tags, t] });
    }
    setTagInput('');
  };

  const addTodo = () => {
    const t = newTodo.trim();
    if (!t) return;
    update({ todos: [...draft.todos, { id: genId(), text: t, done: false }] });
    setNewTodo('');
  };

  const toggleTodo = (id: string) =>
    update({ todos: draft.todos.map(td => td.id === id ? { ...td, done: !td.done } : td) });

  const removeTodo = (id: string) =>
    update({ todos: draft.todos.filter(td => td.id !== id) });

  const colorCfg = COLORS.find(c => c.id === draft.color) || COLORS[0];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-2xl max-h-[95vh] rounded-[32px] border-2 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 ${colorCfg.bg} ${colorCfg.border}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4 gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Type selector */}
            <div className="flex gap-1 p-1 bg-white/70 rounded-xl border border-white/50">
              {(Object.entries(TYPE_CONFIG) as [NoteType, typeof TYPE_CONFIG[NoteType]][]).map(([k, v]) => (
                <button key={k} onClick={() => update({ type: k })}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${draft.type === k ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-white'}`}>
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
            {/* Priority */}
            <select
              value={draft.priority}
              onChange={e => update({ priority: e.target.value as Priority })}
              className={`text-[10px] font-black px-3 py-1.5 rounded-xl border-0 outline-none cursor-pointer ${PRIORITY_CONFIG[draft.priority].cls}`}
            >
              {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
            {/* Pin */}
            <button onClick={() => update({ pinned: !draft.pinned })}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${draft.pinned ? 'bg-amber-400 text-white' : 'bg-white/70 text-slate-400 hover:bg-white'}`}>
              📌 {draft.pinned ? 'Pinlangan' : 'Pin'}
            </button>
          </div>
          <button onClick={onClose}
            className="w-10 h-10 rounded-2xl hover:bg-black/10 flex items-center justify-center text-xl text-slate-500 transition shrink-0">
            ✕
          </button>
        </div>

        {/* Color picker */}
        <div className="flex items-center gap-2 px-8 mb-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Rang:</span>
          {COLORS.map(c => (
            <button key={c.id} onClick={() => update({ color: c.id })}
              className={`w-6 h-6 rounded-full border-2 transition-all ${c.bg} ${draft.color === c.id ? 'border-indigo-600 scale-125' : 'border-slate-200 hover:scale-110'}`} />
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4">
          <input
            ref={titleRef}
            placeholder="Sarlavha..."
            value={draft.title}
            onChange={e => update({ title: e.target.value })}
            className="w-full text-2xl font-black bg-transparent outline-none placeholder-slate-300 text-slate-800 border-b border-slate-200/50 pb-3"
          />

          <textarea
            placeholder={draft.type === 'todo' ? "Izoh (ixtiyoriy)..." : "Matn yozing..."}
            value={draft.content}
            onChange={e => update({ content: e.target.value })}
            rows={4}
            className="w-full bg-transparent outline-none text-slate-700 font-medium leading-relaxed resize-none placeholder-slate-300"
          />

          {/* TODO LIST */}
          {draft.type === 'todo' && (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vazifalar ro&apos;yxati</p>
              <div className="space-y-1.5">
                {draft.todos.map(td => (
                  <div key={td.id} className="flex items-center gap-3 group">
                    <button onClick={() => toggleTodo(td.id)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${td.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-400'}`}>
                      {td.done && <span className="text-[10px] font-black">✓</span>}
                    </button>
                    <span className={`flex-1 text-sm font-medium ${td.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{td.text}</span>
                    <button onClick={() => removeTodo(td.id)}
                      className="w-6 h-6 rounded-lg text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-xs font-black">✕</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  value={newTodo}
                  onChange={e => setNewTodo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTodo()}
                  placeholder="Yangi vazifa qo'shish..."
                  className="flex-1 px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-400 placeholder-slate-300"
                />
                <button onClick={addTodo}
                  className="px-4 py-2.5 bg-indigo-600 text-white font-black rounded-xl text-sm hover:bg-indigo-700 transition active:scale-95">+</button>
              </div>
            </div>
          )}

          {/* TAGS */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teglar</p>
            <div className="flex flex-wrap gap-2">
              {draft.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-white/70 border border-slate-200 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-600">
                  #{tag}
                  <button onClick={() => update({ tags: draft.tags.filter(t => t !== tag) })}
                    className="text-slate-300 hover:text-red-500 transition ml-0.5 font-black text-xs">✕</button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ',') && addTag()}
                placeholder="teg qo'shish..."
                className="px-3 py-1 bg-transparent outline-none text-[11px] font-bold text-slate-500 placeholder-slate-300 border border-dashed border-slate-300 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex justify-end gap-3 border-t border-white/50 pt-5">
          <button onClick={onClose}
            className="px-6 py-3 rounded-2xl text-slate-500 font-black text-sm hover:bg-black/5 transition">
            Bekor
          </button>
          <button
            onClick={() => { onSave({ ...draft, updatedAt: now() }); onClose(); }}
            disabled={!draft.title.trim() && !draft.content.trim() && draft.todos.length === 0}
            className="px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition active:scale-95 shadow-lg shadow-indigo-200 disabled:opacity-40 text-sm"
          >
            💾 Saqlash
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── NOTE CARD ─────────────────────────────────────────────── */
const NoteCard = ({
  note,
  onEdit,
  onDelete,
  onPin,
}: { note: Note; onEdit: () => void; onDelete: () => void; onPin: () => void }) => {
  const colorCfg = COLORS.find(c => c.id === note.color) || COLORS[0];
  const prCfg = PRIORITY_CONFIG[note.priority];
  const typeCfg = TYPE_CONFIG[note.type];
  const doneTodos = note.todos.filter(t => t.done).length;
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div className={`relative rounded-[24px] border-2 p-6 flex flex-col gap-3 group transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${colorCfg.bg} ${colorCfg.border}`}>
      {note.pinned && (
        <span className="absolute -top-3 -right-2 text-lg drop-shadow-md rotate-12">📌</span>
      )}

      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">{typeCfg.icon}</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${prCfg.cls}`}>
            {prCfg.icon} {prCfg.label}
          </span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onPin}
            className={`w-7 h-7 rounded-xl text-sm flex items-center justify-center transition ${note.pinned ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'}`}>
            📌
          </button>
          <button onClick={onEdit}
            className="w-7 h-7 rounded-xl text-sm flex items-center justify-center text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition">
            ✏️
          </button>
          <button onClick={() => setConfirmDel(true)}
            className="w-7 h-7 rounded-xl text-sm flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition">
            🗑️
          </button>
        </div>
      </div>

      {/* Title */}
      {note.title && (
        <h3 className="font-black text-slate-800 text-lg leading-tight line-clamp-2">{note.title}</h3>
      )}

      {/* Content */}
      {note.content && (
        <p className="text-sm text-slate-600 font-medium leading-relaxed line-clamp-4 whitespace-pre-wrap">{note.content}</p>
      )}

      {/* TODO progress */}
      {note.type === 'todo' && note.todos.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
            <span>Bajarildi</span>
            <span>{doneTodos}/{note.todos.length}</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${note.todos.length > 0 ? (doneTodos / note.todos.length) * 100 : 0}%` }}
            />
          </div>
          <div className="space-y-1 mt-1">
            {note.todos.slice(0, 4).map(td => (
              <div key={td.id} className="flex items-center gap-2 text-xs">
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] shrink-0 ${td.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                  {td.done && '✓'}
                </span>
                <span className={td.done ? 'line-through text-slate-400' : 'text-slate-600 font-medium'}>{td.text}</span>
              </div>
            ))}
            {note.todos.length > 4 && (
              <p className="text-[10px] text-slate-400 font-bold ml-5">+{note.todos.length - 4} ta ko&apos;proq...</p>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {note.tags.map(tag => (
            <span key={tag} className="text-[10px] font-bold bg-white/70 border border-slate-200 text-slate-500 px-2 py-0.5 rounded-lg">#{tag}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <p className="text-[10px] text-slate-400 font-medium mt-auto pt-2 border-t border-black/5">
        {timeAgo(note.updatedAt)}
      </p>

      {/* Confirm delete overlay */}
      {confirmDel && (
        <div className="absolute inset-0 rounded-[24px] bg-white/95 backdrop-blur flex flex-col items-center justify-center gap-4 z-10 animate-in fade-in duration-150">
          <p className="font-black text-slate-700 text-sm text-center px-4">Bu eslatmani o&apos;chirmoqchimisiz?</p>
          <div className="flex gap-2">
            <button onClick={onDelete}
              className="px-5 py-2.5 bg-red-600 text-white font-black rounded-xl text-xs hover:bg-red-700 active:scale-95 transition">
              O&apos;chirish
            </button>
            <button onClick={() => setConfirmDel(false)}
              className="px-5 py-2.5 bg-slate-100 text-slate-600 font-black rounded-xl text-xs hover:bg-slate-200 active:scale-95 transition">
              Bekor
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── MAIN COMPONENT ────────────────────────────────────────── */
export const NotesManager = () => {
  const [notes, setNotes] = useState<Note[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('notes_v2');
        if (saved) return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return [];
  });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | NoteType>('all');
  const [filterPrio, setFilterPrio] = useState<'all' | Priority>('all');
  const [editing, setEditing] = useState<Note | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Persist
  useEffect(() => {
    localStorage.setItem('notes_v2', JSON.stringify(notes));
  }, [notes]);

  const saveNote = (note: Note) => {
    setNotes(prev => {
      const idx = prev.findIndex(n => n.id === note.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = note;
        return next;
      }
      return [note, ...prev];
    });
  };

  const deleteNote = (id: string) =>
    setNotes(prev => prev.filter(n => n.id !== id));

  const togglePin = (id: string) =>
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));

  const filtered = notes
    .filter(n => filterType === 'all' || n.type === filterType)
    .filter(n => filterPrio === 'all' || n.priority === filterPrio)
    .filter(n => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.includes(q)) ||
        n.todos.some(td => td.text.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const pOrder: Priority[] = ['urgent', 'high', 'normal', 'low'];
      const pa = pOrder.indexOf(a.priority), pb = pOrder.indexOf(b.priority);
      if (pa !== pb) return pa - pb;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const stats = {
    total: notes.length,
    todo: notes.filter(n => n.type === 'todo').length,
    urgent: notes.filter(n => n.priority === 'urgent').length,
    done: notes.filter(n => n.type === 'todo' && n.todos.length > 0 && n.todos.every(t => t.done)).length,
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Eslatmalar</h2>
          <p className="text-slate-500 mt-2 font-medium">
            Jami <span className="text-indigo-600 font-bold">{stats.total}</span> ta eslatma
            {stats.urgent > 0 && <> · <span className="text-red-500 font-bold">🔴 {stats.urgent} ta shoshilinch</span></>}
          </p>
        </div>
        <button
          onClick={() => { setEditing(emptyNote()); setIsNew(true); }}
          className="flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 active:scale-95 transition shadow-xl shadow-indigo-100"
        >
          <span className="text-xl">+</span> Yangi eslatma
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Barchasi', value: stats.total, icon: '📓', color: 'indigo' },
          { label: 'Vazifalar', value: stats.todo, icon: '✅', color: 'emerald' },
          { label: "Shoshilinch", value: stats.urgent, icon: '🔴', color: 'red' },
          { label: "Bajarilgan", value: stats.done, icon: '🎉', color: 'violet' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Qidirish (sarlavha, matn, teg)..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
        </div>
        {/* Type filter */}
        <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
          {([['all', '📋 Barchasi'], ['note', '📝 Eslatma'], ['todo', '✅ Vazifa'], ['reminder', '🔔 Eslatgich']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilterType(k as any)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${filterType === k ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {l}
            </button>
          ))}
        </div>
        {/* Priority filter */}
        <select
          value={filterPrio}
          onChange={e => setFilterPrio(e.target.value as any)}
          className="text-[10px] font-black px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none cursor-pointer text-slate-600"
        >
          <option value="all">⚡ Barcha ustuvorlik</option>
          {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
      </div>

      {/* Notes Grid */}
      {filtered.length === 0 ? (
        <div className="py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-xl font-black text-slate-300">
            {notes.length === 0 ? "Hali eslatma yo'q" : "Hech narsa topilmadi"}
          </p>
          {notes.length === 0 && (
            <button
              onClick={() => { setEditing(emptyNote()); setIsNew(true); }}
              className="mt-6 px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition active:scale-95 text-sm"
            >
              Birinchi eslatmani qo'shish →
            </button>
          )}
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-5 space-y-5">
          {filtered.map(note => (
            <div key={note.id} className="break-inside-avoid mb-5">
              <NoteCard
                note={note}
                onEdit={() => { setEditing(note); setIsNew(false); }}
                onDelete={() => deleteNote(note.id)}
                onPin={() => togglePin(note.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {editing && (
        <NoteEditor
          note={editing}
          onSave={saveNote}
          onClose={() => { setEditing(null); setIsNew(false); }}
        />
      )}
    </div>
  );
};
