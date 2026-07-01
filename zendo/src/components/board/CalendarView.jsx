import { useState } from "react";
import moment from "moment";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CalendarMonthView from "./CalendarMonthView";
import CalendarDayView from "./CalendarDayView";
import { useHolidays } from "@/hooks/useHolidays";

const VIEW_MODES = [
  { key: "day", label: "Day" },
  { key: "3day", label: "3 Days" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

export default function CalendarView({ cards, lists = [], onCardClick, onCardCreated, onCardUpdate, boardId, showHolidays = false, holidayCountries = ["US"] }) {
  const [viewMode, setViewMode] = useState("3day");
  const [current, setCurrent] = useState(moment().startOf("day"));

  const navigate = (dir) => {
    if (viewMode === "month") {
      setCurrent(prev => prev.clone().add(dir, "month"));
    } else if (viewMode === "week") {
      setCurrent(prev => prev.clone().add(dir * 7, "days"));
    } else if (viewMode === "3day") {
      setCurrent(prev => prev.clone().add(dir * 3, "days"));
    } else {
      setCurrent(prev => prev.clone().add(dir, "day"));
    }
  };

  const goToday = () => {
    if (viewMode === "month") setCurrent(moment().startOf("month"));
    else setCurrent(moment().startOf("day"));
  };

  const getHeaderLabel = () => {
    if (viewMode === "month") return current.format("MMMM YYYY");
    if (viewMode === "week") {
      const end = current.clone().add(6, "days");
      if (current.month() === end.month()) return `${current.format("MMM D")} – ${end.format("D, YYYY")}`;
      return `${current.format("MMM D")} – ${end.format("MMM D, YYYY")}`;
    }
    if (viewMode === "3day") {
      const end = current.clone().add(2, "days");
      return `${current.format("MMM D")} – ${end.format("D, YYYY")}`;
    }
    return current.format("dddd, MMMM D, YYYY");
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === "month") {
      setCurrent(moment().startOf("month"));
    } else {
      setCurrent(moment().startOf("day"));
    }
  };

  const numDays = viewMode === "day" ? 1 : viewMode === "3day" ? 3 : 7;

  const visibleYears = viewMode === "month"
    ? [current.year()]
    : Array.from(new Set(Array.from({ length: numDays }, (_, i) => current.clone().add(i, "day").year())));

  const holidayMap = useHolidays({ enabled: showHolidays, countryCodes: holidayCountries, years: visibleYears });

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      <div className="bg-white rounded-lg shadow flex flex-col overflow-hidden flex-1">
        {/* Header */}
        <div className="shrink-0 flex flex-col border-b">
          <div className="flex items-center px-3 py-2 gap-1">
            <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
            <button onClick={() => navigate(1)} className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
            <button onClick={goToday} className="text-xs font-medium text-gray-600 border border-gray-200 rounded px-2 py-0.5 hover:bg-gray-50 whitespace-nowrap">
              Today
            </button>
            <h2 className="text-xs font-bold text-gray-800 flex-1 text-center truncate px-1">{getHeaderLabel()}</h2>
          </div>
          <div className="flex border-t">
            {VIEW_MODES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleViewModeChange(key)}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0 ${
                  viewMode === key ? "bg-[#0079BF] text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* View */}
        {viewMode === "month" ? (
          <CalendarMonthView
            cards={cards}
            lists={lists}
            onCardClick={onCardClick}
            onCardCreated={onCardCreated}
            onCardUpdate={onCardUpdate}
            boardId={boardId}
            current={current}
            holidayMap={holidayMap}
          />
        ) : (
          <CalendarDayView
            cards={cards}
            lists={lists}
            onCardClick={onCardClick}
            onCardCreated={onCardCreated}
            onCardUpdate={onCardUpdate}
            boardId={boardId}
            current={current}
            numDays={numDays}
            holidayMap={holidayMap}
          />
        )}
      </div>
    </div>
  );
}