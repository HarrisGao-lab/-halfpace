'use client';
import { useState, useEffect } from 'react';
import { loadRuns } from '@/lib/runLog';
import {
  loadShoes, saveShoe, updateShoe, deleteShoe,
  shoeKm, shoeStatus, activeShoes, type Shoe,
} from '@/lib/shoes';
import { Plus, Trash2, ChevronLeft, Footprints, Pencil, X, Check } from 'lucide-react';
import Link from 'next/link';

const SHOE_COLORS = ['#FF6B35', '#32ade6', '#30d158', '#bf5af2', '#ff9f0a', '#ef4444', '#ff453a', '#fff'];

function ShoeForm({ initial, onSave, onCancel }: {
  initial?: Partial<Shoe>;
  onSave: (s: Omit<Shoe, 'id'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [color, setColor] = useState(initial?.color ?? '#FF6B35');
  const [startKm, setStartKm] = useState(initial?.startKm ?? 0);
  const [maxKm, setMaxKm] = useState(initial?.maxKm ?? 700);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  return (
    <div className="rounded-2xl p-4 space-y-4" style={{ background: '#0a0a0a', border: '1px solid #1e1e1e' }}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold">{initial?.name ? 'Edit Shoe' : 'New Shoe'}</span>
        <button onClick={onCancel}><X size={16} style={{ color: '#555' }} /></button>
      </div>

      <div className="space-y-3">
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="Shoe name (e.g. Pegasus 41)"
          className="w-full px-3 py-2.5 rounded-xl text-sm"
          style={{ background: '#161616', color: '#fff', border: '1px solid #2a2a2a', outline: 'none' }} />
        <input value={brand} onChange={e => setBrand(e.target.value)}
          placeholder="Brand (e.g. Nike)"
          className="w-full px-3 py-2.5 rounded-xl text-sm"
          style={{ background: '#161616', color: '#fff', border: '1px solid #2a2a2a', outline: 'none' }} />

        <div>
          <p className="text-xs mb-2" style={{ color: '#555' }}>Color</p>
          <div className="flex gap-2">
            {SHOE_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: c, border: color === c ? '2px solid #fff' : '2px solid transparent' }}>
                {color === c && <Check size={12} color={c === '#fff' ? '#000' : '#fff'} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs mb-1.5" style={{ color: '#555' }}>Starting km</p>
            <input type="number" value={startKm} onChange={e => setStartKm(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl text-sm"
              style={{ background: '#161616', color: '#fff', border: '1px solid #2a2a2a', outline: 'none' }} />
          </div>
          <div>
            <p className="text-xs mb-1.5" style={{ color: '#555' }}>Retire at km</p>
            <input type="number" value={maxKm} onChange={e => setMaxKm(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl text-sm"
              style={{ background: '#161616', color: '#fff', border: '1px solid #2a2a2a', outline: 'none' }} />
          </div>
        </div>

        <input value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="w-full px-3 py-2.5 rounded-xl text-sm"
          style={{ background: '#161616', color: '#fff', border: '1px solid #2a2a2a', outline: 'none' }} />
      </div>

      <button
        onClick={() => {
          if (!name.trim()) return;
          onSave({
            name: name.trim(), brand: brand.trim(), color, startKm, maxKm,
            addedDate: new Date().toISOString().slice(0, 10),
            retired: false, notes,
          });
        }}
        className="w-full py-3 rounded-2xl text-sm font-bold"
        style={{ background: '#FF6B35', color: '#000' }}>
        Save Shoe
      </button>
    </div>
  );
}

export default function ShoesPage() {
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [runs, setRuns] = useState<{ id: string; distanceKm: number }[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    setShoes(loadShoes());
    setRuns(loadRuns().map(r => ({ id: r.id, distanceKm: r.distanceKm })));
  }, []);

  function refresh() {
    setShoes(loadShoes());
    setRuns(loadRuns().map(r => ({ id: r.id, distanceKm: r.distanceKm })));
  }

  const allShoes = shoes;
  const active = shoes.filter(s => !s.retired);
  const retired = shoes.filter(s => s.retired);

  return (
    <div className="h-screen overflow-y-auto" style={{ color: '#fff', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      <header className="px-5 pt-14 pb-6 flex items-start justify-between">
        <div>
          <Link href="/settings" className="flex items-center gap-1.5 text-xs mb-4" style={{ color: 'rgba(255,255,255,0.32)' }}>
            <ChevronLeft size={14} /> Settings
          </Link>
          <p className="text-[11px] tracking-[0.2em] uppercase mb-1" style={{ color: '#555' }}>Gear</p>
          <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em' }}>Shoes</h1>
        </div>
        <button onClick={() => { setAdding(true); setEditing(null); }}
          className="w-9 h-9 rounded-full flex items-center justify-center mt-12"
          style={{ background: '#FF6B35' }}>
          <Plus size={18} color="#000" />
        </button>
      </header>

      <div className="px-5 pb-32 space-y-4">

        {adding && (
          <ShoeForm
            onSave={s => { saveShoe(s); refresh(); setAdding(false); }}
            onCancel={() => setAdding(false)}
          />
        )}

        {active.length === 0 && !adding && (
          <div className="text-center py-16">
            <Footprints size={48} style={{ color: 'rgba(255,255,255,0.12)', margin: '0 auto 12px' }} />
            <p className="text-sm" style={{ color: '#555' }}>No shoes yet. Add your training shoes to track mileage.</p>
          </div>
        )}

        {active.map(shoe => {
          const km = shoeKm(shoe.id, runs);
          const status = shoeStatus(km, shoe.maxKm);
          const isEditing = editing === shoe.id;

          if (isEditing) {
            return (
              <ShoeForm key={shoe.id} initial={shoe}
                onSave={s => { updateShoe(shoe.id, s); refresh(); setEditing(null); }}
                onCancel={() => setEditing(null)}
              />
            );
          }

          return (
            <div key={shoe.id} className="rounded-2xl overflow-hidden"
              style={{ background: '#0a0a0a', border: '1px solid #1e1e1e' }}>
              <div className="px-4 py-4 flex items-center gap-3">
                {/* Color swatch */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${shoe.color}20` }}>
                  <Footprints size={18} style={{ color: shoe.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold truncate">{shoe.name}</span>
                    {shoe.brand && (
                      <span className="text-[10px]" style={{ color: '#444' }}>{shoe.brand}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold" style={{ color: shoe.color }}>{km} km</span>
                    <span className="text-[10px]" style={{ color: '#444' }}>/ {shoe.maxKm} km</span>
                    <span className="text-[10px] font-semibold" style={{ color: status.color }}>
                      {status.label}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e1e' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${status.pct}%`, background: status.color }} />
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditing(shoe.id)} className="p-2 rounded-lg" style={{ color: '#444' }}>
                    <Pencil size={14} />
                  </button>
                  {confirming === shoe.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => { deleteShoe(shoe.id); refresh(); setConfirming(null); }}
                        className="px-2 py-1 rounded-lg text-xs font-semibold"
                        style={{ background: '#ef444425', color: '#ef4444' }}>Delete</button>
                      <button onClick={() => setConfirming(null)}
                        className="p-1.5 rounded-lg" style={{ color: '#444' }}>
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirming(shoe.id)} className="p-2 rounded-lg" style={{ color: '#333' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {km >= shoe.maxKm * 0.85 && (
                <div className="px-4 py-2 text-xs font-semibold"
                  style={{ borderTop: '1px solid #1a1a1a', color: status.color, background: `${status.color}08` }}>
                  {km >= shoe.maxKm
                    ? 'Time to retire these shoes. Running in worn-out shoes increases injury risk.'
                    : `Only ${shoe.maxKm - km}km left before retirement.`}
                </div>
              )}

              <div className="px-4 pb-2 pt-1 flex justify-end">
                <button onClick={() => { updateShoe(shoe.id, { retired: true }); refresh(); }}
                  className="text-[10px] font-semibold" style={{ color: '#333' }}>
                  Retire shoe
                </button>
              </div>
            </div>
          );
        })}

        {retired.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] tracking-[0.2em] uppercase mb-3" style={{ color: '#333' }}>Retired</p>
            {retired.map(shoe => {
              const km = shoeKm(shoe.id, runs);
              return (
                <div key={shoe.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-2"
                  style={{ background: '#0a0a0a', opacity: 0.5 }}>
                  <Footprints size={16} style={{ color: '#444' }} />
                  <div className="flex-1">
                    <span className="text-sm" style={{ color: '#444' }}>{shoe.name}</span>
                    <span className="text-xs ml-2" style={{ color: '#333' }}>{km} km</span>
                  </div>
                  <button onClick={() => { updateShoe(shoe.id, { retired: false }); refresh(); }}
                    className="text-[10px] font-semibold" style={{ color: '#555' }}>
                    Restore
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
