import { useMemo, useRef, useState } from "react";
import type { HandoverPerson } from "../../api/handovers";

type Props = {
  value: string;
  mentionUserIds: string[];
  managers: HandoverPerson[];
  tags: string[];
  placeholder: string;
  maxLength?: number;
  autoFocus?: boolean;
  onChange: (value: string, mentionUserIds: string[]) => void;
};

type SuggestionMode = "mention" | "tag";

export function managerHandle(manager: HandoverPerson) {
  return `@${manager.lastName}_${manager.firstName}`.replace(/\s+/g, "_");
}

export function HandoverEditor({
  value,
  mentionUserIds,
  managers,
  tags,
  placeholder,
  maxLength = 4000,
  autoFocus,
  onChange
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursor, setCursor] = useState(value.length);
  const token = value.slice(0, cursor).match(/(?:^|\s)([@#])([^\s@#]*)$/u);
  const mode: SuggestionMode | null = token?.[1] === "@" ? "mention" : token?.[1] === "#" ? "tag" : null;
  const query = (token?.[2] ?? "").toLocaleLowerCase("hu-HU");

  const suggestions = useMemo(() => {
    if (mode === "mention") {
      return managers
        .filter((manager) => {
          const searchable = `${manager.lastName} ${manager.firstName} ${managerHandle(manager)}`.toLocaleLowerCase("hu-HU");
          return searchable.includes(query);
        })
        .slice(0, 6);
    }
    if (mode === "tag") {
      return tags.filter((tag) => tag.toLocaleLowerCase("hu-HU").includes(query)).slice(0, 6);
    }
    return [];
  }, [managers, mode, query, tags]);

  function update(nextValue: string, nextCursor: number) {
    const activeMentionIds = mentionUserIds.filter((id) => {
      const manager = managers.find((item) => item.id === id);
      return manager ? nextValue.includes(managerHandle(manager)) : false;
    });
    onChange(nextValue, activeMentionIds);
    setCursor(nextCursor);
  }

  function insertSuggestion(suggestion: HandoverPerson | string) {
    if (!token || !mode) return;
    const tokenText = token[0];
    const leadingSpace = tokenText.match(/^\s/u)?.[0] ?? "";
    const start = cursor - tokenText.length;
    const inserted =
      mode === "mention"
        ? managerHandle(suggestion as HandoverPerson)
        : `#${suggestion as string}`;
    const nextValue = `${value.slice(0, start)}${leadingSpace}${inserted} ${value.slice(cursor)}`;
    const nextCursor = start + leadingSpace.length + inserted.length + 1;
    const nextMentionIds =
      mode === "mention"
        ? [...new Set([...mentionUserIds, (suggestion as HandoverPerson).id])]
        : mentionUserIds;
    onChange(nextValue, nextMentionIds);
    setCursor(nextCursor);
    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        autoFocus={autoFocus}
        value={value}
        maxLength={maxLength}
        rows={4}
        placeholder={placeholder}
        className="w-full resize-y rounded-md border border-brown/20 bg-cream/30 px-3 py-3 text-sm outline-none transition focus:border-red focus:ring-2 focus:ring-red/20"
        onChange={(event) => update(event.target.value, event.target.selectionStart)}
        onClick={(event) => setCursor(event.currentTarget.selectionStart)}
        onKeyUp={(event) => setCursor(event.currentTarget.selectionStart)}
      />
      {mode && suggestions.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-brown/10 bg-white shadow-xl">
          {suggestions.map((suggestion) => {
            const key = typeof suggestion === "string" ? suggestion : suggestion.id;
            const label =
              typeof suggestion === "string"
                ? `#${suggestion}`
                : `${managerHandle(suggestion)} · ${suggestion.lastName} ${suggestion.firstName}`;
            return (
              <button
                key={key}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm font-semibold hover:bg-cream"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insertSuggestion(suggestion)}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="mt-1 flex justify-between gap-3 text-xs text-brown/55">
        <span>`@` manager megjelölése · `#` tag hozzáadása</span>
        <span>{value.length}/{maxLength}</span>
      </div>
    </div>
  );
}
