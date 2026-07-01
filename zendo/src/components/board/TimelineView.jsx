import { useState } from "react";
import moment from "moment";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const DAY_WIDTH = 36;
const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 40; // week + day headers combined
const WEEKS = 8;

function CardBarTooltip({ card, lists, children }) {
  const list = lists.find(l => l.id === card.list_id);
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-semibold text-sm">{card.title}</p>
        {list && <p className="text-xs text-muted-foreground mt-0.5">📋 {list.title}</p>}
        {card.due_date && <p className="text-xs text-muted-foreground mt-0.5">📅 {moment(card.due_date).format("MMM D, YYYY")}</p>}
      </TooltipContent>
    </Tooltip>
  );
}

export default function TimelineView({ cards, lists, onCardClick }) {
  const [startWeek, setStartWeek] = useState(moment().startOf("week"));

  const days = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    days.push(startWeek.clone().add(i, "days"));
  }
  const weeks = [];
  for (let i = 0; i < WEEKS; i++) {
    weeks.push(startWeek.clone().add(i, "weeks"));
  }

  const rangeStart = startWeek.clone();
  const rangeEnd = startWeek.clone().add(WEEKS, "weeks");
  const totalWidth = WEEKS * 7 * DAY_WIDTH;

  const activeCards = cards.filter(c => !c.is_archived);
  const cardsWithDates = activeCards.filter(c => c.start_date || c.due_date);
  const cardsWithoutDates = activeCards.filter(c => !c.start_date && !c.due_date);

  const listGroups = lists.map(list => ({
    list,
    cards: cardsWithDates.filter(c => c.list_id === list.id),
  })).filter(g => g.cards.length > 0 || lists.length <= 10); // show all lists if few

  const getCardBar = (card) => {
    const start = card.start_date ? moment(card.start_date) : moment(card.due_date);
    const end = card.due_date ? moment(card.due_date) : moment(card.start_date);
    const clampedStart = moment.max(start, rangeStart);
    const clampedEnd = moment.min(end, rangeEnd.clone().subtract(1, "day"));
    if (clampedStart.isAfter(clampedEnd)) return null;
    const left = clampedStart.diff(rangeStart, "days") * DAY_WIDTH;
    const width = (clampedEnd.diff(clampedStart, "days") + 1) * DAY_WIDTH;
    const label = (card.labels || [])[0];
    return { left, width, color: label?.color || "#0079BF" };
  };

  const DayGridCells = () => (
    <>
      {days.map((day) => (
        <div
          key={day.toISOString()}
          style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH, height: ROW_HEIGHT }}
          className={`border-r shrink-0 ${[0, 6].includes(day.day()) ? "bg-gray-100/50" : ""} ${day.isSame(moment(), "day") ? "bg-blue-50/40" : ""}`}
        />
      ))}
    </>
  );

  return (
    <TooltipProvider>
    <div className="flex-1 overflow-auto p-4">
      <div className="bg-white rounded-lg shadow overflow-hidden">

        {/* Navigation bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
          <button onClick={() => setStartWeek(s => s.clone().subtract(WEEKS, "weeks"))} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-700">
            {startWeek.format("MMM D")} – {startWeek.clone().add(WEEKS, "weeks").subtract(1, "day").format("MMM D, YYYY")}
          </span>
          <button onClick={() => setStartWeek(s => s.clone().add(WEEKS, "weeks"))} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
          <button onClick={() => setStartWeek(moment().startOf("week"))} className="ml-2 text-xs text-[#0079BF] hover:underline">
            Today
          </button>
        </div>

        {/* Main layout: fixed left sidebar + scrollable timeline */}
        <div className="flex overflow-hidden">

          {/* Left sidebar — fixed width, does NOT scroll horizontally */}
          <div className="w-44 shrink-0 border-r bg-gray-50 flex flex-col overflow-y-auto">
            {/* Header spacer to align with week+day headers */}
            <div style={{ height: HEADER_HEIGHT }} className="border-b bg-gray-50 shrink-0" />

            {listGroups.map(({ list, cards: lc }) => (
              <div key={list.id}>
                {/* List group header */}
                <div className="px-3 text-xs font-bold text-gray-600 bg-[#EBECF0] border-b truncate flex items-center" style={{ height: ROW_HEIGHT }}>
                  {list.title}
                </div>
                {/* Card rows */}
                {lc.map(card => (
                  <div
                    key={card.id}
                    className="px-3 text-xs text-gray-700 border-b truncate cursor-pointer hover:bg-blue-50 flex items-center"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => onCardClick(card)}
                    title={card.title}
                  >
                    {card.title}
                  </div>
                ))}
                {lc.length === 0 && (
                  <div className="px-3 text-xs text-gray-400 border-b italic flex items-center" style={{ height: ROW_HEIGHT }}>
                    No cards
                  </div>
                )}
              </div>
            ))}

            {cardsWithoutDates.length > 0 && (
              <>
                <div className="px-3 text-xs font-bold text-gray-400 bg-gray-100 border-b flex items-center" style={{ height: ROW_HEIGHT }}>
                  No dates
                </div>
                {cardsWithoutDates.map(card => (
                  <div
                    key={card.id}
                    className="px-3 text-xs text-gray-400 border-b truncate italic cursor-pointer hover:bg-blue-50 flex items-center"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => onCardClick(card)}
                    title={card.title}
                  >
                    {card.title}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Right timeline — scrolls horizontally AND vertically in sync with sidebar */}
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <div style={{ width: totalWidth }}>

              {/* Week headers row */}
              <div className="flex border-b bg-gray-50" style={{ height: 20 }}>
                {weeks.map(w => (
                  <div key={w.toISOString()} className="flex items-center px-2 text-[11px] font-semibold text-gray-500 border-r" style={{ width: 7 * DAY_WIDTH, minWidth: 7 * DAY_WIDTH }}>
                    {w.format("MMM D")}
                  </div>
                ))}
              </div>

              {/* Day headers row */}
              <div className="flex border-b bg-gray-50" style={{ height: 20 }}>
                {days.map(day => {
                  const isToday = day.isSame(moment(), "day");
                  return (
                    <div
                      key={day.toISOString()}
                      style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                      className={`flex items-center justify-center text-[10px] border-r font-medium ${isToday ? "text-[#0079BF] bg-blue-50" : "text-gray-400"} ${[0, 6].includes(day.day()) ? "bg-gray-100/60" : ""}`}
                    >
                      {day.format("D")}
                    </div>
                  );
                })}
              </div>

              {/* List + card rows */}
              {listGroups.map(({ list, cards: lc }) => (
                <div key={list.id}>
                  {/* List group header row */}
                  <div className="flex border-b bg-[#EBECF0]/40" style={{ height: ROW_HEIGHT }}>
                    {days.map(day => (
                      <div key={day.toISOString()} style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }} className={`border-r h-full shrink-0 ${[0, 6].includes(day.day()) ? "bg-gray-100/40" : ""} ${day.isSame(moment(), "day") ? "bg-blue-50/30" : ""}`} />
                    ))}
                  </div>

                  {/* Card rows */}
                  {lc.map(card => {
                    const bar = getCardBar(card);
                    return (
                      <div key={card.id} className="relative flex border-b" style={{ height: ROW_HEIGHT }}>
                        <DayGridCells />
                        {bar && (
                          <CardBarTooltip card={card} lists={lists}>
                            <div
                              className="absolute top-1.5 bottom-1.5 rounded flex items-center px-2 cursor-pointer text-white text-[11px] font-semibold truncate hover:opacity-90 transition-opacity shadow-sm"
                              style={{ left: bar.left, width: bar.width, backgroundColor: bar.color, minWidth: 8 }}
                              onClick={() => onCardClick(card)}
                            >
                              {bar.width > 40 ? card.title : ""}
                            </div>
                          </CardBarTooltip>
                        )}
                      </div>
                    );
                  })}

                  {lc.length === 0 && (
                    <div className="relative flex border-b" style={{ height: ROW_HEIGHT }}>
                      <DayGridCells />
                    </div>
                  )}
                </div>
              ))}

              {/* No-dates section */}
              {cardsWithoutDates.length > 0 && (
                <>
                  <div className="flex border-b bg-gray-100/40" style={{ height: ROW_HEIGHT }}>
                    {days.map(day => (
                      <div key={day.toISOString()} style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }} className="border-r h-full shrink-0" />
                    ))}
                  </div>
                  {cardsWithoutDates.map(card => (
                    <div key={card.id} className="relative flex border-b" style={{ height: ROW_HEIGHT }}>
                      <DayGridCells />
                      <div
                        className="absolute inset-y-2 left-2 right-2 rounded bg-gray-200/60 flex items-center px-2 text-[11px] text-gray-400 italic cursor-pointer"
                        onClick={() => onCardClick(card)}
                      >
                        {card.title}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}