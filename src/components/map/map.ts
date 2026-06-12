import type * as Leaflet from "leaflet";
import type { } from "leaflet.markercluster";
import { CombatElement, cssStyleSheet } from "../../internal/base-element";
import leafletCss from "leaflet/dist/leaflet.css?inline";
import clusterCss from "leaflet.markercluster/dist/MarkerCluster.css?inline";
import clusterDefaultCss from "leaflet.markercluster/dist/MarkerCluster.Default.css?inline";
import mapCss from "./map.css?inline";

export interface CuiMapReadyDetail {
  map: Leaflet.Map;
}

export interface CuiMapPointClickDetail {
  point: HTMLElement;
  lat: number;
  lng: number;
}

export interface CuiMapRegionClickDetail {
  region: HTMLScriptElement;
  feature: GeoJSON.Feature;
}

export interface CuiMapBoundsChangeDetail {
  bounds: Leaflet.LatLngBounds;
  zoom: number;
}

const POINT_SELECTOR = ".cui-map-point";
const REGION_SELECTOR = "script[type='application/geo+json'].cui-map-region";
const ICON_TEMPLATE_SELECTOR = "template[slot='marker-icon']";

const DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

let leafletModule: typeof Leaflet | null = null;
let leafletLoad: Promise<typeof Leaflet> | null = null;

async function loadLeaflet(): Promise<typeof Leaflet> {
  if (leafletModule) return leafletModule;
  if (!leafletLoad) {
    leafletLoad = import("leaflet").then((module) => {
      leafletModule = module;
      // Legacy Leaflet plugins (markercluster, draw, heat, etc.) are UMD
      // bundles whose factories reference `L` as a global. Vite's ESM
      // dynamic-import path never assigns `window.L`, so the plugins throw
      // `ReferenceError: L is not defined` when imported. Expose the loaded
      // namespace globally to keep plugin compatibility.
      if (typeof window !== "undefined") {
        (window as unknown as { L: typeof Leaflet }).L = module;
      }
      return module;
    });
  }
  return leafletLoad;
}

let clusterLoad: Promise<void> | null = null;

async function loadCluster(): Promise<void> {
  if (!clusterLoad) {
    clusterLoad = import("leaflet.markercluster").then(() => undefined);
  }
  await clusterLoad;
}

function parseLatLng(value: string | null): Leaflet.LatLngTuple | null {
  if (!value) return null;

  const [latStr, lngStr] = value.split(",").map((s) => s.trim());
  const lat = Number(latStr);
  const lng = Number(lngStr);

  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
}

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * Leaflet-backed interactive map with clustered points, GeoJSON regions,
 * theme-aware tiles, and a lazy-loaded library bundle. Points and regions
 * are declared as light-DOM children so content stays SEO-visible and
 * server-renderable.
 *
 * @element cui-map
 *
 * @slot - Fallback content shown before the library loads or when JS is
 *   disabled (e.g. a static `<address>` list).
 * @slot title - Accessible title for the map (becomes an `aria-label`).
 * @slot legend - Visual legend rendered alongside the map.
 * @slot marker-icon - Template for custom marker icons. Cloned per point.
 *
 * @attr {string} center - Initial center as `"lat,lng"` (e.g. `52.37,4.89`).
 * @attr {string} zoom - Initial zoom level.
 * @attr {string} min-zoom - Minimum zoom level allowed.
 * @attr {string} max-zoom - Maximum zoom level allowed.
 * @attr {string} tile-url - Tile URL template. Defaults to OpenStreetMap.
 * @attr {string} tile-attribution - HTML attribution string for the tiles.
 * @attr {string} tile-subdomains - Comma-separated subdomain list for the
 *   tile URL template.
 * @attr {boolean} cluster - Group nearby markers into clusters.
 * @attr {boolean} fit-bounds - Auto-zoom to fit all points/regions on load.
 * @attr {boolean} interactive - Enable pan/zoom (default true).
 * @attr {boolean} scroll-wheel-zoom - Enable scroll-wheel zoom.
 *
 * @fires {CustomEvent<CuiMapReadyDetail>} cui-map-ready - Fires once the
 *   library has loaded and the map is interactive.
 * @fires {CustomEvent<CuiMapPointClickDetail>} cui-map-point-click - Fires
 *   when a marker is clicked.
 * @fires {CustomEvent<CuiMapRegionClickDetail>} cui-map-region-click - Fires
 *   when a GeoJSON region is clicked.
 * @fires {CustomEvent<CuiMapBoundsChangeDetail>} cui-map-bounds-change -
 *   Fires after the user pans or zooms.
 *
 * @example
 * <cui-map center="52.37,4.89" zoom="11" cluster fit-bounds>
 *   <span slot="title">Office locations</span>
 *   <a class="cui-map-point" data-lat="52.37" data-lng="4.89"
 *      data-category="office" href="/locations/amsterdam">Amsterdam</a>
 *   <script type="application/geo+json" class="cui-map-region"
 *           data-color="#0066ff" data-label="Service area">
 *     { "type": "Polygon", "coordinates": [ ... ] }
 *   </script>
 * </cui-map>
 */
export class CuiMap extends CombatElement {
  static override tagName = "cui-map";
  static override readonly styles = [
    cssStyleSheet(leafletCss),
    cssStyleSheet(clusterCss),
    cssStyleSheet(clusterDefaultCss),
    cssStyleSheet(mapCss),
  ];
  static observedAttributes = [
    "center",
    "zoom",
    "min-zoom",
    "max-zoom",
    "tile-url",
    "tile-attribution",
    "tile-subdomains",
    "cluster",
    "fit-bounds",
    "interactive",
    "scroll-wheel-zoom",
    "data-theme",
  ];

  private leaflet: typeof Leaflet | null = null;
  private map: Leaflet.Map | null = null;
  private tiles: Leaflet.TileLayer | null = null;
  private markerLayer: Leaflet.LayerGroup | null = null;
  private regionLayer: Leaflet.GeoJSON | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private abortController: AbortController | null = null;
  private ready = false;

  connectedCallback(): void {
    this.renderTemplate(`
      <div class="map" part="map">
        <slot name="title"></slot>
        <div class="canvas" part="canvas" role="region"></div>
        <slot name="legend"></slot>
        <div class="fallback" part="fallback">
          <slot></slot>
        </div>
      </div>
    `);

    this.syncAriaLabel();
    this.observeIntersection();
  }

  disconnectedCallback(): void {
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    this.abortController?.abort();
    this.abortController = null;
    this.map?.remove();
    this.map = null;
    this.tiles = null;
    this.markerLayer = null;
    this.regionLayer = null;
    this.ready = false;
    this.removeAttribute("mounted");
  }

  attributeChangedCallback(name: string): void {
    if (name === "data-theme") {
      return; // Theme changes don't require map updates
    }
    if (!this.ready || !this.map) return;

    switch (name) {
      case "center":
      case "zoom":
      case "min-zoom":
      case "max-zoom":
        this.applyView();
        break;
      case "tile-url":
      case "tile-attribution":
      case "tile-subdomains":
        this.applyTiles();
        break;
      case "cluster":
        void this.rebuildMarkers();
        break;
      case "interactive":
      case "scroll-wheel-zoom":
        this.applyInteractivity();
        break;
    }
  }

  get leafletMap(): Leaflet.Map | null {
    return this.map;
  }

  get isReady(): boolean {
    return this.ready;
  }

  get clustered(): boolean {
    return this.hasAttribute("cluster");
  }

  get interactive(): boolean {
    return this.getAttribute("interactive") !== "false";
  }

  get scrollWheelZoom(): boolean {
    return this.getAttribute("scroll-wheel-zoom") !== "false";
  }

  refresh(): void {
    if (!this.ready) return;
    void this.rebuildMarkers();
    this.rebuildRegions();
  }

  private observeIntersection(): void {
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.intersectionObserver?.disconnect();
          this.intersectionObserver = null;
          void this.mount();
        }
      },
      { rootMargin: "200px" },
    );
    this.intersectionObserver.observe(this);
  }

  private async mount(): Promise<void> {
    const leaflet = await loadLeaflet();
    if (this.clustered) {
      await loadCluster();
    }
    if (!this.isConnected) return;

    this.leaflet = leaflet;
    const canvas = this.shadowRoot?.querySelector(
      ".canvas",
    ) as HTMLElement | null;
    if (!canvas) return;

    this.map = leaflet.map(canvas, {
      zoomControl: this.interactive,
      dragging: this.interactive,
      scrollWheelZoom: this.scrollWheelZoom,
      keyboard: true,
      attributionControl: true,
      zoomAnimation: !this.prefersReducedMotion(),
      fadeAnimation: !this.prefersReducedMotion(),
    });
    const attributionControl = this.map.attributionControl;
    if (attributionControl) {
      attributionControl.setPrefix(false);
    }

    this.applyTiles();
    this.applyView();
    await this.rebuildMarkers();
    this.rebuildRegions();
    this.applyFitBounds();

    this.bindMapEvents();
    this.observeMutations();

    this.ready = true;
    this.toggleAttribute("mounted", true);
    this.dispatchEvent(
      new CustomEvent<CuiMapReadyDetail>("cui-map-ready", {
        detail: { map: this.map },
        bubbles: true,
      }),
    );
  }

  private bindMapEvents(): void {
    this.abortController?.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;
    const map = this.map;
    if (!map) return;

    const onBoundsChange = (): void => {
      this.dispatchEvent(
        new CustomEvent<CuiMapBoundsChangeDetail>("cui-map-bounds-change", {
          detail: {
            bounds: map.getBounds(),
            zoom: map.getZoom(),
          },
          bubbles: true,
        }),
      );
    };
    map.on("moveend zoomend", onBoundsChange);
    signal.addEventListener("abort", () => {
      map.off("moveend zoomend", onBoundsChange);
    });
  }

  private observeMutations(): void {
    this.mutationObserver?.disconnect();
    this.mutationObserver = new MutationObserver(() => {
      this.refresh();
    });
    this.mutationObserver.observe(this, { childList: true });
  }

  private applyView(): void {
    if (!this.map) return;

    const center = parseLatLng(this.getAttribute("center")) ?? [0, 0];
    const zoom = parseNumber(this.getAttribute("zoom")) ?? 4;
    this.map.setView(center, zoom);

    const minZoom = parseNumber(this.getAttribute("min-zoom"));
    if (minZoom !== null) {
      this.map.setMinZoom(minZoom);
    }
    const maxZoom = parseNumber(this.getAttribute("max-zoom"));
    if (maxZoom !== null) {
      this.map.setMaxZoom(maxZoom);
    }
  }

  private applyTiles(): void {
    if (!this.map || !this.leaflet) return;

    this.tiles?.remove();
    this.tiles = this.leaflet
      .tileLayer(this.getAttribute("tile-url") ?? DEFAULT_TILE_URL, {
        attribution:
          this.getAttribute("tile-attribution") ?? DEFAULT_TILE_ATTRIBUTION,
        subdomains: this.getAttribute("tile-subdomains") ?? "abc",
        maxZoom: 19,
      })
      .addTo(this.map);
  }

  private applyInteractivity(): void {
    if (!this.map) return;
    if (this.interactive) {
      this.map.dragging.enable();
    } else {
      this.map.dragging.disable();
    }

    if (this.scrollWheelZoom) {
      this.map.scrollWheelZoom.enable();
    } else {
      this.map.scrollWheelZoom.disable();
    }
  }

  private applyFitBounds(): void {
    if (!this.map || !this.markerLayer) return;

    const explicit = this.getAttribute("fit-bounds");
    if (explicit === "false") return;

    const markers = this.markerLayer
      .getLayers()
      .filter(
        (layer): layer is Leaflet.Marker =>
          layer instanceof this.leaflet!.Marker,
      );
    if (markers.length < 2 && explicit !== "true") return;

    const group = this.leaflet!.featureGroup(markers);
    this.map.fitBounds(group.getBounds(), { padding: [24, 24] });
  }

  private async rebuildMarkers(): Promise<void> {
    if (!this.map || !this.leaflet) return;
    if (this.clustered) await loadCluster();

    const leaflet = this.leaflet;
    this.markerLayer?.remove();
    this.markerLayer =
      this.clustered && leaflet.MarkerClusterGroup
        ? leaflet.markerClusterGroup({ showCoverageOnHover: false })
        : leaflet.layerGroup();
    const iconTemplates = this.readIconTemplates();
    const articles = this.querySelectorAll<HTMLElement>(POINT_SELECTOR);

    for (const article of articles) {
      const lat = parseNumber(article.dataset.lat ?? null);
      const lng = parseNumber(article.dataset.lng ?? null);
      if (lat === null || lng === null) continue;

      const heading =
        article.querySelector("h1, h2, h3, h4, h5, h6")?.textContent?.trim() ??
        "";
      const category = article.dataset.category ?? "";
      const template = iconTemplates.get(category) ?? iconTemplates.get("");

      // Default marker: inline SVG teardrop with its tip at (14, 37) in a
      // 28x37 viewport. iconSize + iconAnchor anchor the visual tip on the
      // lat/lng. Slotted templates take responsibility for their own visual
      // anchoring — Leaflet centres them on the lat/lng by default.
      const icon = template
        ? leaflet.divIcon({
          className: "cui-map-marker",
          html: template.innerHTML,
        })
        : leaflet.divIcon({
          className: "cui-map-marker cui-map-marker--default",
          html:
            '<svg viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12c0 8 12 20 12 20s12-12 12-20C24 5.4 18.6 0 12 0z"/>' +
            "</svg>",
          iconSize: [28, 37],
          iconAnchor: [14, 37],
          popupAnchor: [0, -32],
        });

      const marker = leaflet.marker([lat, lng], {
        icon,
        title: heading ?? "",
        alt: heading ?? "",
        keyboard: true,
      });

      marker.bindPopup(() => this.renderPopupContent(article), {
        className: "cui-map-popup",
        maxWidth: 300,
      });

      marker.on("click", () => {
        this.dispatchEvent(
          new CustomEvent<CuiMapPointClickDetail>("cui-map-point-click", {
            detail: {
              point: article,
              lat,
              lng,
            },
            bubbles: true,
          }),
        );
      });

      this.markerLayer.addLayer(marker);
    }

    this.markerLayer.addTo(this.map);
  }

  private rebuildRegions(): void {
    if (!this.map || !this.leaflet) return;
    const leaflet = this.leaflet;

    this.regionLayer?.remove();
    this.regionLayer = null;

    const scripts = this.querySelectorAll<HTMLScriptElement>(REGION_SELECTOR);
    if (scripts.length === 0) return;

    const entries: Array<{
      script: HTMLScriptElement;
      feature: GeoJSON.Feature;
    }> = [];
    for (const script of scripts) {
      const text = script.textContent?.trim();
      if (!text) continue;

      try {
        const parsed = JSON.parse(text) as GeoJSON.Feature | GeoJSON.Geometry;
        const feature: GeoJSON.Feature =
          parsed.type === "Feature"
            ? (parsed as GeoJSON.Feature)
            : {
              type: "Feature",
              geometry: parsed as GeoJSON.Geometry,
              properties: {},
            };
        entries.push({ script, feature });
      } catch {
        // Skip invalid JSON
      }
    }

    if (entries.length === 0) return;

    this.regionLayer = leaflet
      .geoJSON(
        entries.map((e) => e.feature),
        {
          style: (feature) => {
            const entry = entries.find(
              (candidate) => candidate.feature === feature,
            );
            const color = entry?.script.dataset.color;
            return {
              className: color
                ? `cui-map-region cui-map-region--${color}`
                : "cui-map-region",
              weight: 2,
            };
          },
          onEachFeature: (feature, layer) => {
            const entry = entries.find((e) => e.feature === feature);
            if (!entry) return;

            const label = entry.script.dataset.label;
            if (label) layer.bindTooltip(label, { sticky: true });

            layer.on("click", () => {
              this.dispatchEvent(
                new CustomEvent<CuiMapRegionClickDetail>(
                  "cui-map-region-click",
                  {
                    detail: {
                      region: entry.script,
                      feature,
                    },
                    bubbles: true,
                  },
                ),
              );
            });
          },
        },
      )
      .addTo(this.map);
  }

  private renderPopupContent(article: HTMLElement): HTMLElement {
    const clone = article.cloneNode(true) as HTMLElement;
    clone.removeAttribute("hidden");
    clone.classList.add("cui-map-popup-content");
    return clone;
  }

  private readIconTemplates(): Map<string, HTMLTemplateElement> {
    const templates = new Map<string, HTMLTemplateElement>();
    const nodes = this.querySelectorAll<HTMLTemplateElement>(
      ICON_TEMPLATE_SELECTOR,
    );
    for (const template of nodes) {
      templates.set(template.dataset.category ?? "", template);
    }
    return templates;
  }

  private syncAriaLabel(): void {
    const canvas = this.shadowRoot?.querySelector<HTMLDivElement>(".canvas");
    if (!canvas) return;
    canvas.setAttribute("aria-label", this.getAttribute("aria-label") ?? "Map");
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }
}
