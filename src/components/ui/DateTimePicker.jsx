import { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
const DOW_LABELS = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

/** Returns YYYY-MM-DD for a Date object */
function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses YYYY-MM-DD → Date at noon local time (avoids TZ off-by-one) */
function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

function Calendar({ value, onChange, min, schedule, closures }) {
  const today = toISO(new Date());
  const [viewYear,  setViewYear]  = useState(() => (value ? fromISO(value) : new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (value ? fromISO(value) : new Date()).getMonth()); // 0–11

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  // Build grid: first cell = Monday of the week that contains the 1st
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startDow = (firstOfMonth.getDay() + 6) % 7; // 0=Mon…6=Sun
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));

  function getDayState(date) {
    const iso = toISO(date);
    const past = !!(min && iso < min);
    if (past) return { disabled: true, kind: 'past' };

    // Specific closure override
    const closure = closures?.find(c => c.date === iso);
    if (closure) {
      if (closure.accepts_emergencies) return { disabled: false, kind: 'emergency' };
      return { disabled: true, kind: 'closure' };
    }

    // Weekly schedule
    if (schedule) {
      const dow = (date.getDay() + 6) % 7; // convert Sun=0 → Mon=0 display, but keep JS dow for lookup
      const jsDow = date.getDay(); // 0=Sun…6=Sat as stored in DB
      const dayRow = schedule.find(s => s.day_of_week === jsDow);
      if (dayRow && !dayRow.is_open) return { disabled: true, kind: 'weekday_closed' };
    }

    return { disabled: false, kind: 'open' };
  }

  return (
    <div className="p-3 w-[264px]">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="size-7 rounded-[6px] flex items-center justify-center hover:bg-[var(--cq-surface-3)] transition-colors"
        >
          <Icons.ChevronLeft size={13} />
        </button>
        <span className="text-[13px] font-medium text-[var(--cq-fg)]">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="size-7 rounded-[6px] flex items-center justify-center hover:bg-[var(--cq-surface-3)] transition-colors"
        >
          <Icons.ChevronRight size={13} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW_LABELS.map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-[var(--cq-fg-muted)] py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;
          const iso   = toISO(date);
          const sel   = iso === value;
          const isToday = iso === today;
          const { disabled, kind } = getDayState(date);

          let cls = 'h-8 w-full rounded-[6px] text-[13px] transition-colors relative ';
          if (sel) {
            cls += 'bg-[var(--cq-accent)] text-white font-medium';
          } else if (disabled) {
            cls += 'opacity-30 cursor-default text-[var(--cq-fg-muted)]';
          } else if (kind === 'emergency') {
            cls += 'text-[var(--cq-warn)] font-medium hover:bg-[var(--cq-surface-3)]';
          } else if (isToday) {
            cls += 'border border-[var(--cq-accent)] text-[var(--cq-accent)] font-medium hover:bg-[var(--cq-accent-soft)]';
          } else {
            cls += 'text-[var(--cq-fg)] hover:bg-[var(--cq-surface-3)]';
          }

          return (
            <button
              key={iso}
              disabled={disabled}
              onClick={() => onChange(iso)}
              title={
                kind === 'closure'        ? 'Clínica cerrada ese día' :
                kind === 'weekday_closed' ? 'La clínica no trabaja ese día' :
                kind === 'emergency'      ? 'Solo urgencias ese día' :
                undefined
              }
              className={cls}
            >
              {date.getDate()}
              {/* Small dot for emergency-only days */}
              {kind === 'emergency' && !sel && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full"
                  style={{ background: 'var(--cq-warn)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend — only when schedule is provided */}
      {schedule && (
        <div className="mt-3 pt-2.5 border-t border-[var(--cq-border)] flex flex-wrap gap-x-3 gap-y-1">
          <span className="flex items-center gap-1 text-[10.5px] text-[var(--cq-fg-muted)]">
            <span className="size-2.5 rounded-[3px] opacity-30 bg-[var(--cq-fg-muted)]" /> No disponible
          </span>
          <span className="flex items-center gap-1 text-[10.5px] text-[var(--cq-fg-muted)]">
            <span className="size-2.5 rounded-[3px]" style={{ background: 'var(--cq-warn)', opacity: 0.7 }} /> Solo urgencias
          </span>
        </div>
      )}
    </div>
  );
}

// ─── DatePicker ───────────────────────────────────────────────────────────────

export function DatePicker({ value, onChange, disabled, min, schedule, closures }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const display = value
    ? (() => { const d = fromISO(value); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`; })()
    : 'Seleccionar fecha';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 h-11 px-3 rounded-[9px] border w-full text-left transition-colors
          disabled:opacity-50 disabled:cursor-default
          ${open
            ? 'border-[var(--cq-fg)] bg-[var(--cq-bg)]'
            : 'border-[var(--cq-border)] bg-[var(--cq-bg)] hover:border-[var(--cq-fg-muted)]'
          }`}
      >
        <Icons.Calendar size={14} className="text-[var(--cq-fg-muted)] shrink-0" />
        <span className={`text-[13.5px] flex-1 ${value ? 'text-[var(--cq-fg)]' : 'text-[var(--cq-fg-muted)]'}`}>
          {display}
        </span>
        <Icons.ChevronRight
          size={12}
          className={`text-[var(--cq-fg-muted)] shrink-0 transition-transform ${open ? 'rotate-90' : 'rotate-0'}`}
        />
      </button>

      {open && (
        <div
          className="cq-modal-in-fast absolute left-0 top-[calc(100%+4px)] z-50 bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[12px] shadow-xl"
        >
          <Calendar
            value={value}
            onChange={(iso) => { onChange(iso); setOpen(false); }}
            min={min}
            schedule={schedule}
            closures={closures}
          />
        </div>
      )}
    </div>
  );
}

// ─── TimePicker ───────────────────────────────────────────────────────────────

const HOURS   = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5)); // 00,05…55

const ITEM_H    = 36;   // px — height of each row
const VISIBLE   = 5;    // rows visible at once
const PAD_ITEMS = 2;    // blank rows added top/bottom so first/last items can center

function ScrollColumn({ items, selected, onSelect, colRef }) {
  return (
    <div className="relative w-14" style={{ height: ITEM_H * VISIBLE }}>
      {/* Top fade */}
      <div
        className="absolute inset-x-0 top-0 z-10 pointer-events-none"
        style={{
          height: ITEM_H * 2,
          background: 'linear-gradient(to bottom, var(--cq-surface) 10%, transparent)',
        }}
      />
      {/* Bottom fade */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
        style={{
          height: ITEM_H * 2,
          background: 'linear-gradient(to top, var(--cq-surface) 10%, transparent)',
        }}
      />
      {/* Center selection highlight */}
      <div
        className="absolute inset-x-2 z-0 rounded-[7px] pointer-events-none"
        style={{
          top:    ITEM_H * PAD_ITEMS,
          height: ITEM_H,
          background: 'color-mix(in oklch, var(--cq-accent) 10%, transparent)',
          border: '1px solid color-mix(in oklch, var(--cq-accent) 25%, transparent)',
        }}
      />
      {/* Scrollable list */}
      <ul
        ref={colRef}
        className="h-full overflow-y-auto cq-scroll-hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Top padding rows */}
        {Array.from({ length: PAD_ITEMS }).map((_, i) => (
          <li key={`pad-top-${i}`} style={{ height: ITEM_H }} />
        ))}
        {items.map(item => (
          <li
            key={item}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(item)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(item); } }}
            style={{ height: ITEM_H }}
            className={`flex items-center justify-center font-mono text-[15px] cursor-pointer select-none transition-colors rounded-[7px]
              ${item === selected
                ? 'text-[var(--cq-accent)]'
                : 'text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)]'
              }`}
          >
            {item}
          </li>
        ))}
        {/* Bottom padding rows */}
        {Array.from({ length: PAD_ITEMS }).map((_, i) => (
          <li key={`pad-bottom-${i}`} style={{ height: ITEM_H }} />
        ))}
      </ul>
    </div>
  );
}

export function TimePicker({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const hRef    = useRef(null);
  const mRef    = useRef(null);

  const [hStr, mStr] = (value ?? '09:00').split(':');

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // Scroll to selected items when popover opens
  useEffect(() => {
    if (!open) return;
    const scrollTo = (ref, items, sel) => {
      if (!ref.current) return;
      const idx = items.indexOf(sel);
      if (idx >= 0) ref.current.scrollTop = idx * ITEM_H;
    };
    // Small delay so DOM is painted before scrolling
    const id = setTimeout(() => {
      scrollTo(hRef, HOURS,   hStr);
      scrollTo(mRef, MINUTES, mStr);
    }, 20);
    return () => clearTimeout(id);
  }, [open, hStr, mStr]);

  function selectH(h) { onChange(`${h}:${mStr}`); }
  function selectM(m) { onChange(`${hStr}:${m}`); }

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger button — same style as DatePicker */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 h-11 px-3 rounded-[9px] border w-full text-left transition-colors
          disabled:opacity-50 disabled:cursor-default
          ${open
            ? 'border-[var(--cq-fg)] bg-[var(--cq-bg)]'
            : 'border-[var(--cq-border)] bg-[var(--cq-bg)] hover:border-[var(--cq-fg-muted)]'
          }`}
      >
        <ClockIcon />
        <span className="font-mono text-[14px] text-[var(--cq-fg)] flex-1 tracking-wide">
          {value ?? '09:00'}
        </span>
        <Icons.ChevronRight
          size={12}
          className={`text-[var(--cq-fg-muted)] shrink-0 transition-transform ${open ? 'rotate-90' : 'rotate-0'}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="cq-modal-in-fast absolute left-0 top-[calc(100%+4px)] z-50 bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[12px] shadow-xl overflow-hidden"
        >
          <div className="flex items-center px-2 pt-3 pb-2 gap-1">
            <ScrollColumn items={HOURS}   selected={hStr} onSelect={selectH} colRef={hRef} />
            <span className="font-mono text-[18px] font-medium text-[var(--cq-fg-muted)] pb-0.5 select-none">:</span>
            <ScrollColumn items={MINUTES} selected={mStr} onSelect={selectM} colRef={mRef} />
          </div>
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full h-8 rounded-[7px] bg-[var(--cq-accent)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Clock icon ───────────────────────────────────────────────────────────────

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-[var(--cq-fg-muted)] shrink-0">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 4.5V7L8.5 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
