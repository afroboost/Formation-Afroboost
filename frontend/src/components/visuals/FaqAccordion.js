import { useState } from 'react';
import { HelpCircle, ChevronDown, MessageCircleQuestion } from 'lucide-react';

const BRAND_GRADIENT = 'linear-gradient(135deg,#8a2be2,#ff00ff)';

/**
 * One FAQ row: a clickable question button + a collapsible answer panel.
 * Disclosure is driven by `isOpen`; the answer uses a grid-rows height
 * transition (0fr -> 1fr) so it expands/collapses smoothly without
 * measuring pixel heights.
 */
function FaqItem({ item, index, isOpen, onToggle }) {
  const panelId = `faq-panel-${item.id ?? index}`;
  const buttonId = `faq-button-${item.id ?? index}`;

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-[#160a18] transition-all duration-200 ${
        isOpen
          ? 'border-[#ff00ff]/50 ring-1 ring-[#ff00ff]/40'
          : 'border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/5'
      }`}
    >
      {/* Question row (always visible, full-width clickable) */}
      <button
        type="button"
        id={buttonId}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors duration-200"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
          style={{
            background: BRAND_GRADIENT,
            boxShadow: isOpen ? '0 0 12px rgba(255,0,255,0.55)' : 'none',
          }}
        >
          <HelpCircle className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 font-semibold text-white">
          {item.q}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-purple-300 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Answer panel: smooth grid-rows + opacity disclosure */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pl-5">
            <p
              className="whitespace-pre-wrap border-l-2 pl-4 text-sm leading-relaxed text-gray-300"
              style={{ borderImage: `${BRAND_GRADIENT} 1` }}
            >
              {item.a}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Questions des participants — accordion FAQ with progressive disclosure.
 * Only questions are shown by default; clicking a question reveals its
 * answer. Single-open behaviour: opening one question closes any other.
 *
 * @param {{ items?: Array<{ id?: string|number, q: string, a: string }> }} props
 */
export default function FaqAccordion({ items }) {
  const list = Array.isArray(items) ? items : [];
  const [openId, setOpenId] = useState(null);

  if (!list.length) return null;

  const keyOf = (item, index) => item.id ?? index;

  const handleToggle = (key) => {
    setOpenId((prev) => (prev === key ? null : key));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircleQuestion className="h-5 w-5 text-[#ff00ff]" />
        <h3 className="text-base font-bold text-white sm:text-lg">
          Questions des participants
        </h3>
      </div>

      <div className="space-y-3">
        {list.map((item, index) => {
          const key = keyOf(item, index);
          return (
            <FaqItem
              key={key}
              item={item}
              index={index}
              isOpen={openId === key}
              onToggle={() => handleToggle(key)}
            />
          );
        })}
      </div>
    </div>
  );
}
