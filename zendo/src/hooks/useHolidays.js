import { useState, useEffect } from "react";

const cache = {};

async function fetchNagerHolidays(countryCode, year) {
  const key = `nager-${countryCode}-${year}`;
  if (cache[key]) return cache[key];
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
    if (res.ok) {
      const data = await res.json();
      // normalize to {date, name}
      const normalized = data.map(h => ({ date: h.date, name: h.localName || h.name }));
      cache[key] = normalized;
      return normalized;
    }
  } catch {}
  return [];
}

async function fetchHebcalHolidays(year) {
  const key = `hebcal-${year}`;
  if (cache[key]) return cache[key];
  try {
    const res = await fetch(
      `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=off&mod=off&nx=off&year=${year}&month=x&ss=off&mf=off&c=off&geo=none&M=on&s=off`
    );
    if (res.ok) {
      const data = await res.json();
      const normalized = (data.items || [])
        .filter(h => h.category === "holiday")
        .map(h => ({ date: h.date, name: h.hebrew || h.title }));
      cache[key] = normalized;
      return normalized;
    }
  } catch {}
  return [];
}

export function useHolidays({ enabled, countryCodes = [], years }) {
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    if (!enabled || !countryCodes?.length || !years?.length) {
      setHolidays([]);
      return;
    }

    let cancelled = false;
    const fetchAll = async () => {
      const results = [];
      for (const countryCode of countryCodes) {
        for (const year of years) {
          let data;
          if (countryCode === "IL") {
            data = await fetchHebcalHolidays(year);
          } else {
            data = await fetchNagerHolidays(countryCode, year);
          }
          results.push(...data);
        }
      }
      if (!cancelled) setHolidays(results);
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [enabled, JSON.stringify(countryCodes), JSON.stringify(years)]);

  // Returns a map: "YYYY-MM-DD" -> holiday names
  const holidayMap = holidays.reduce((acc, h) => {
    acc[h.date] = acc[h.date] ? `${acc[h.date]}, ${h.name}` : h.name;
    return acc;
  }, {});

  return holidayMap;
}