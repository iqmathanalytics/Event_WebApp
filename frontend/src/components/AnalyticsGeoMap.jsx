import { memo, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLinear } from "d3-scale";

const WORLD_GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const US_GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const GA_TO_MAP_NAME = {
  "United States": "United States of America",
  "United Kingdom": "United Kingdom",
  Russia: "Russia",
  "South Korea": "South Korea",
  "North Korea": "North Korea"
};

const US_STATE_ABBR = {
  al: "Alabama",
  ak: "Alaska",
  az: "Arizona",
  ar: "Arkansas",
  ca: "California",
  co: "Colorado",
  ct: "Connecticut",
  de: "Delaware",
  fl: "Florida",
  ga: "Georgia",
  hi: "Hawaii",
  id: "Idaho",
  il: "Illinois",
  in: "Indiana",
  ia: "Iowa",
  ks: "Kansas",
  ky: "Kentucky",
  la: "Louisiana",
  me: "Maine",
  md: "Maryland",
  ma: "Massachusetts",
  mi: "Michigan",
  mn: "Minnesota",
  ms: "Mississippi",
  mo: "Missouri",
  mt: "Montana",
  ne: "Nebraska",
  nv: "Nevada",
  nh: "New Hampshire",
  nj: "New Jersey",
  nm: "New Mexico",
  ny: "New York",
  nc: "North Carolina",
  nd: "North Dakota",
  oh: "Ohio",
  ok: "Oklahoma",
  or: "Oregon",
  pa: "Pennsylvania",
  ri: "Rhode Island",
  sc: "South Carolina",
  sd: "South Dakota",
  tn: "Tennessee",
  tx: "Texas",
  ut: "Utah",
  vt: "Vermont",
  va: "Virginia",
  wa: "Washington",
  wc: "Washington DC",
  dc: "District of Columbia",
  wv: "West Virginia",
  wi: "Wisconsin",
  wy: "Wyoming"
};

function normalizeKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

function isUnitedStates(country) {
  const c = normalizeKey(country);
  return c === "united states" || c === "us" || c === "usa" || c === "united states of america";
}

function resolveUsStateName(region) {
  const raw = String(region || "").trim();
  if (!raw || raw === "(not set)") {
    return "";
  }
  const key = normalizeKey(raw);
  if (US_STATE_ABBR[key]) {
    return US_STATE_ABBR[key];
  }
  return raw
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function metricValue(row) {
  return Number(row.users ?? row.views ?? 0) || 0;
}

function MapTooltip({ hover }) {
  if (!hover) {
    return null;
  }
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5"
      style={{ left: hover.x, top: hover.y }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{hover.kind}</p>
      <p className="text-sm font-bold text-slate-900">{hover.label}</p>
      <p className="mt-0.5 text-sm tabular-nums text-rose-700">
        <span className="font-bold">{hover.value.toLocaleString("en-US")}</span>{" "}
        <span className="font-medium text-slate-600">{hover.unit}</span>
      </p>
    </div>
  );
}

function AnalyticsGeoMap({ countries = [] }) {
  const [hover, setHover] = useState(null);

  const { stateMap, countryMap, hasUsStates } = useMemo(() => {
    const states = new Map();
    const countriesAcc = new Map();

    for (const row of countries) {
      const val = metricValue(row);
      if (!val) {
        continue;
      }
      if (isUnitedStates(row.country)) {
        const stateName = resolveUsStateName(row.region);
        if (stateName) {
          const sk = normalizeKey(stateName);
          states.set(sk, (states.get(sk) || 0) + val);
        } else {
          countriesAcc.set(
            normalizeKey("United States of America"),
            (countriesAcc.get(normalizeKey("United States of America")) || 0) + val
          );
        }
        continue;
      }
      const key = normalizeKey(row.country);
      if (!key) {
        continue;
      }
      countriesAcc.set(key, (countriesAcc.get(key) || 0) + val);
      const alias = GA_TO_MAP_NAME[row.country];
      if (alias) {
        countriesAcc.set(normalizeKey(alias), (countriesAcc.get(normalizeKey(alias)) || 0) + val);
      }
    }

    return {
      stateMap: states,
      countryMap: countriesAcc,
      hasUsStates: states.size > 0
    };
  }, [countries]);

  const stateMax = useMemo(() => {
    const vals = [...stateMap.values()];
    return vals.length ? Math.max(...vals) : 1;
  }, [stateMap]);

  const countryMax = useMemo(() => {
    const vals = [...countryMap.values()];
    return vals.length ? Math.max(...vals) : 1;
  }, [countryMap]);

  const stateColorScale = useMemo(
    () => scaleLinear().domain([0, stateMax]).range(["#e2e8f0", "#e11d48"]),
    [stateMax]
  );

  const countryColorScale = useMemo(
    () => scaleLinear().domain([0, countryMax]).range(["#e2e8f0", "#e11d48"]),
    [countryMax]
  );

  if (!countries.length) {
    return (
      <p className="text-sm text-slate-500">
        No location data yet. Share your event link to start seeing where visitors are from.
      </p>
    );
  }

  if (hasUsStates) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <p className="border-b border-slate-100 px-4 py-2 text-xs font-medium text-slate-600">
          All-time visitors by state — hover for counts
        </p>
        <MapTooltip hover={hover} />
        <ComposableMap
          projection="geoAlbersUsa"
          width={800}
          height={460}
          style={{ width: "100%", height: "auto" }}
        >
          <Geographies geography={US_GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateName = geo.properties?.name || "";
                const value = stateMap.get(normalizeKey(stateName)) || 0;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={value > 0 ? stateColorScale(value) : "#f1f5f9"}
                    stroke="#cbd5e1"
                    strokeWidth={0.5}
                    onMouseLeave={() => setHover(null)}
                    onMouseEnter={(evt) => {
                      const rect = evt.currentTarget.closest("svg")?.getBoundingClientRect();
                      const parent = evt.currentTarget.closest(".relative")?.getBoundingClientRect();
                      if (!parent) {
                        return;
                      }
                      setHover({
                        kind: "State",
                        label: stateName,
                        value,
                        unit: "visitors",
                        x: evt.clientX - parent.left,
                        y: evt.clientY - parent.top - 8
                      });
                    }}
                    style={{
                      default: { outline: "none" },
                      hover: { fill: value > 0 ? "#be123c" : "#cbd5e1", outline: "none", cursor: "pointer" },
                      pressed: { outline: "none" }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white">
      <p className="border-b border-slate-100 px-4 py-2 text-xs font-medium text-slate-600">
        All-time visitors by country — hover for counts
      </p>
      <MapTooltip hover={hover} />
      <ComposableMap projectionConfig={{ scale: 140 }} width={800} height={360} style={{ width: "100%", height: "auto" }}>
        <Geographies geography={WORLD_GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const mapName = geo.properties?.name || "";
              const value =
                countryMap.get(normalizeKey(mapName)) ||
                countryMap.get(normalizeKey(GA_TO_MAP_NAME[mapName])) ||
                0;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={value > 0 ? countryColorScale(value) : "#f1f5f9"}
                  stroke="#cbd5e1"
                  strokeWidth={0.4}
                  onMouseLeave={() => setHover(null)}
                  onMouseEnter={(evt) => {
                    const parent = evt.currentTarget.closest(".relative")?.getBoundingClientRect();
                    if (!parent) {
                      return;
                    }
                    setHover({
                      kind: "Country",
                      label: mapName,
                      value,
                      unit: "visitors",
                      x: evt.clientX - parent.left,
                      y: evt.clientY - parent.top - 8
                    });
                  }}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: value > 0 ? "#be123c" : "#e2e8f0", outline: "none", cursor: "pointer" },
                    pressed: { outline: "none" }
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}

export default memo(AnalyticsGeoMap);
