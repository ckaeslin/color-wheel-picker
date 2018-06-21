import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import * as d3 /*{ select, dispatch, drag }*/ from 'd3';
import { tinycolor } from '@thebespokepixel/es-tinycolor';

const ColorWheelPickerMarkerDatum = function ColorWheelPickerMarkerDatum(color, name, show) {
  this.color = tinycolor(color).toHsv();
  this.name = name;
  this.show = show;
};

/**
 * `color-wheel-picker`
 * color picker with D3 (kuler-d3)
 *
 * @customElement
 * @polymer
 * @demo demo/index.html
 */
class ColorWheelPicker extends PolymerElement {

  static get importMeta() { return import.meta; }

  connectedCallback() {
    super.connectedCallback();

    // render
    console.log(this.radius);
  }

  createElements() {

    const markerWidth = this.markerWidth || 40;
    const radius = this.radius || 175;
    console.log(radius);
    this.options = {
      container: this.$.container,
      svg: this.$.svg,
      radius       : radius,
      margin       : markerWidth / 2, // space around the edge of the wheel
      markerWidth  : markerWidth,
      defaultSlice : 20,
      initRoot     : 'red',
      initMode     : ColorWheelPicker.modes.ANALOGOUS,
      baseClassName: 'ColorWheelPicker',
    };
    const diameter = this.options.radius * 2;
    this.currentMode = this.options.initMode;

    this.slice = this.options.defaultSlice;

    // --- Nodes ---
    this.container = d3.select(this.options.container);
    this.wheel = d3.select(this.options.svg);
    this.wheel.attr('class', this.options.baseClassName)
      .attr('width', diameter)
      .attr('height', diameter)
      .attr('viewBox', [
        -1 * this.options.margin,
        -1 * this.options.margin,
        diameter + 2 * this.options.margin,
        diameter + 2 * this.options.margin
      ].join(' '));

    /*const circle = this.wheel.append('circle');
    circle.attr('fill', 'black')
      .attr('r', this.options.radius)
      .attr('cx', this.options.radius)
      .attr('cy', this.options.radius)
      .attr('transform', 'translate(4, 4)');*/

    const image = this.wheel.append('image');
    image.attr('width', diameter)
      .attr('height', diameter)
      .attr('xlink:href', `${this.importPath}/wheel.png`);

    // this.markerTrails = this.wheel.append('g');
    this.markers = this.wheel.append('g');

    // --- Events ---

    this.dispatch = d3.dispatch(
      // Markers datum has changed, so redraw as necessary, etc.
      'markersUpdated',

      'markersUpdatedPoint',

      // "updateEnd" means the state of the ColorWheelPicker has been finished updating.
      'updateEnd',

      // Initial data was successfully bound.
      'bindData',

      // The mode was changed
      'modeChanged'
    );

    this.dispatch.on('bindData.default', () => {
      this.setHarmony();
    });

    this.dispatch.on('markersUpdated.default', () => {
      const markers = this.getMarkers();
      markers.attr('transform', (d) =>{
          const hue = this.scientificToArtisticSmooth(d.color.h);
          const p = this.getSVGPositionFromHS(d.color.h, d.color.s);
          return ['translate(' + [p.x, p.y].join() + ')'].join(' ');
        })
        .attr('visibility', (d) => {
          return d.show ? 'visible' : 'hidden';
        });
      markers.select('circle')
        .attr('fill', (d) => {
          return this.hexFromHS(d.color.h, d.color.s);
        });

      /*this.container.selectAll(this.selector('marker-trail'))
        .attr('x2', (d) => {
          const p = this.getSVGPositionFromHS(d.color.h, d.color.s);
          return p.x;
        })
        .attr('y2', (d) => {
          const p = this.getSVGPositionFromHS(d.color.h, d.color.s);
          return p.y;
        })
        .attr('visibility', (d) => {
          return d.show ? 'visible' : 'hidden';
        });*/
    });

    this.dispatch.on('markersUpdatedPoint.default', () => {
      const markers = this.getMarkers();
      markers.attr('transform', (d) =>{
          return ['translate(' + [this.point.x, this.point.y].join() + ')'].join(' ');
        })
        .attr('visibility', (d) => {
          return d.show ? 'visible' : 'hidden';
        });
      markers.select('circle')
        .attr('fill', (d) => {
          return this.hexFromHS(d.color.h, d.color.s);
        });
    });

    this.dispatch.on('modeChanged.default', () => {
      this.container.attr('data-mode', this.currentMode);
    });


    // --- Plugins ---

    for (let pluginId in ColorWheelPicker.plugins) {
      if (typeof ColorWheelPicker.plugins[pluginId] == 'function') {
        ColorWheelPicker.plugins[pluginId](this);
      }
    }

    this.__isReady = true;
  }

  _pointChanged(newValue, oldValue) {
    if (this.__isReady === true) {
      this.dispatch.call('markersUpdatedPoint', this);
    }
  }

  bindData(newData) {
    // Data can be passed as a whole number,
    // or an array of ColorWheelPickerMarkerDatum.
    const initRoot = this.options.initRoot;
    let data;
    if (newData.constructor === Array) {
      data = newData;
      this.setMode(ColorWheelPicker.modes.CUSTOM);
    } else {
      // We weren't given any data so create our own.
      const numColors = (typeof newData === 'number') ? newData : 5;
      data = Array.apply(null, {length: numColors}).map(() =>
        new ColorWheelPickerMarkerDatum(initRoot, null, true));
    }

    /*const markerTrails = this.markerTrails.selectAll(this.selector('marker-trail')).data(data);

    markerTrails.enter()
      .append('line')
      .attr('class', this.cx('marker-trail'))
      .attr('x1', this.options.radius)
      .attr('y1', this.options.radius)
      .attr('stroke', 'white')
      .attr('stroke-opacity', 0.75)
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '10, 6');

    markerTrails.exit().remove();*/

    const markers = this.markers.selectAll(this.selector('marker')).data(data);

    const marker = markers.enter().append('g');
    marker
      .attr('class', this.cx('marker'))
      .attr('visibility', 'visible');

    const circle = marker.append('circle')
    circle
      .attr('r', this.options.markerWidth / 2)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.9)
      .attr('cursor', 'move');

    markers.exit().remove();

    const text = markers.append('text');
    text.text(function (d) { return d.name; });
    text
      .attr('x', (this.options.markerWidth / 2) + 8)
      .attr('y', (this.options.markerWidth / 4) - 5)
      .attr('fill', 'white')
      .attr('font-size', '13px');
    this.getMarkers().call(this.getDragBehavior());

    this.dispatch.call('bindData', this, data);
    this.dispatch.call('markersUpdated', this);
    this.dispatch.call('updateEnd', this);
  };

  getDragBehavior() {
    const self = this;
    return d3.drag()
      .on('drag', function(d) {
        const pos = self.pointOnCircle(d3.event.x, d3.event.y);
        this.point = { x: pos.x, y: pos.y };
        const hs = self.getHSFromSVGPosition(pos.x, pos.y);
        d.color.h = hs.h;
        d.color.s = hs.s;

        // TODO: send x and y by socket.io => call update markers on the other end
        const p = self.svgToCartesian(d3.event.x, d3.event.y);
        const dragHue = ((Math.atan2(p.y, p.x) * 180 / Math.PI) + 720) % 360;
        const startingHue = parseFloat(d3.select(this).attr('data-startingHue'));
        const theta1 = (360 + startingHue - dragHue) % 360;
        const theta2 = (360 + dragHue - startingHue) % 360;
        self.updateHarmony(this, theta1 < theta2 ? -1 * theta1 : theta2);
      })
      .on('start', () => {
        this.getVisibleMarkers().attr('data-startingHue', (d) => {
          return this.scientificToArtisticSmooth(d.color.h);
        });
      })
      .on('end', function() {
        const visibleMarkers = self.getVisibleMarkers();
        visibleMarkers.attr('data-startingHue', null);
        if (self.currentMode === ColorWheelPicker.modes.ANALOGOUS) {
          const rootTheta = self.scientificToArtisticSmooth(d3.select(visibleMarkers.nodes()[0]).datum().color.h);
          if (visibleMarkers.nodes().length > 1) {
            const neighborTheta = self.scientificToArtisticSmooth(d3.select(visibleMarkers.nodes()[1]).datum().color.h);
            self.slice = (360 + neighborTheta - rootTheta) % 360;
          }
        }
        self.dispatch.call('updateEnd', this);
      });
  };

  getMarkers() {
    return this.container.selectAll(this.selector('marker'));
  }

  getVisibleMarkers() {
    return this.container.selectAll(this.selector('marker') + '[visibility=visible]');
  }

  getRootMarker() {
    return this.container.select(this.selector('marker') + '[visibility=visible]');
  }

  setHarmony() {
    const root = this.getRootMarker();
    const offsetFactor = 0.08;
    this.getMarkers().classed('root', false);
    if (! root.empty()) {
      const rootHue = this.scientificToArtisticSmooth(root.datum().color.h);
      switch (this.currentMode) {
        case ColorWheelPicker.modes.ANALOGOUS:
          root.classed('root', true);
          this.getVisibleMarkers().each((d, i) => {
            const newHue = (rootHue + (this.markerDistance(i) * this.slice) + 720) % 360;
            d.color.h = this.artisticToScientificSmooth(newHue);
            d.color.s = 1;
            d.color.v = 1;
          });
          break;
        case ColorWheelPicker.modes.MONOCHROMATIC:
        case ColorWheelPicker.modes.SHADES:
          this.getVisibleMarkers().each((d, i) => {
            d.color.h = this.artisticToScientificSmooth(rootHue);
            if (this.currentMode == ColorWheelPicker.modes.SHADES) {
              d.color.s = 1;
              d.color.v = 0.25 + 0.75 * Math.random();
            } else {
              d.color.s = 1 - (0.15 * i + Math.random() * 0.1);
              d.color.v = 0.75 + 0.25 * Math.random();
            }
          });
          break;
        case ColorWheelPicker.modes.COMPLEMENTARY:
          this.getVisibleMarkers().each((d, i) => {
            const newHue = (rootHue + ((i % 2) * 180) + 720) % 360;
            d.color.h = this.artisticToScientificSmooth(newHue);
            d.color.s = 1 - offsetFactor * this.stepFn(2)(i);
            d.color.v = 1;
          });
          break;
        case ColorWheelPicker.modes.TRIAD:
          this.getVisibleMarkers().each((d, i) => {
            const newHue = (rootHue + ((i % 3) * 120) + 720) % 360;
            d.color.h = this.artisticToScientificSmooth(newHue);
            d.color.s = 1 - offsetFactor * this.stepFn(3)(i);
            d.color.v = 1;
          });
          break;
        case ColorWheelPicker.modes.TETRAD:
          this.getVisibleMarkers().each((d, i) => {
            const newHue = (rootHue + ((i % 4) * 90) + 720) % 360;
            d.color.h = this.artisticToScientificSmooth(newHue);
            d.color.s = 1 - offsetFactor * this.stepFn(4)(i);
            d.color.v = 1;
          });
          break;
      }
      this.dispatch.call('markersUpdated', this);
    }
  }

  updateHarmony(target, theta) {
    const self = this;
    const root = this.getRootMarker();
    const rootHue = this.scientificToArtisticSmooth(root.datum().color.h);

    // Find out how far the dragging marker is from the root marker.
    let cursor = target;
    const counter = 0;
    while (cursor = cursor.previousSibling) {
      if (cursor.getAttribute('visibility') !== 'hidden') {
        counter++;
      }
    }
    const targetDistance = this.markerDistance(counter);

    switch (this.currentMode) {
      case ColorWheelPicker.modes.ANALOGOUS:
        this.getVisibleMarkers().each(function(d, i) {
          const startingHue = parseFloat(d3.select(this).attr('data-startingHue'));
          const slices = 1;
          if (targetDistance !== 0) {
            slices = self.markerDistance(i) / targetDistance;
          }
          if (this !== target) {
            d.color.h = self.artisticToScientificSmooth(
              (startingHue + (slices * theta) + 720) % 360
            );
          }
        });
        break;
      case ColorWheelPicker.modes.MONOCHROMATIC:
      case ColorWheelPicker.modes.COMPLEMENTARY:
      case ColorWheelPicker.modes.SHADES:
      case ColorWheelPicker.modes.TRIAD:
      case ColorWheelPicker.modes.TETRAD:
        this.getVisibleMarkers().each(function(d) {
          const startingHue = parseFloat(d3.select(this).attr('data-startingHue'));
          d.color.h = self.artisticToScientificSmooth((startingHue + theta + 720) % 360);
          if (self.currentMode == ColorWheelPicker.modes.SHADES) {
            d.color.s = 1;
          }
        });
        break;
    }
    this.dispatch.call('markersUpdated', this);
  }

  svgToCartesian(x, y) {
    return {'x': x - this.options.radius, 'y': this.options.radius - y};
  }

  cartesianToSVG(x, y) {
    return {'x': x + this.options.radius, 'y': this.options.radius - y};
  }

  pointOnCircle(x, y) {
    const p = this.svgToCartesian(x, y);
    if (Math.sqrt(p.x * p.x + p.y * p.y) <= this.options.radius) {
      return {'x': x, 'y': y};
    } else {
      const theta = Math.atan2(p.y, p.x);
      const x_ = this.options.radius * Math.cos(theta);
      const y_ = this.options.radius * Math.sin(theta);
      return this.cartesianToSVG(x_, y_);
    }
  }

  // Get a coordinate pair from hue and saturation components.
  getSVGPositionFromHS(h, s) {
    const hue = this.scientificToArtisticSmooth(h);
    const theta = hue * (Math.PI / 180);
    const y = Math.sin(theta) * this.options.radius * s;
    const x = Math.cos(theta) * this.options.radius * s;
    return this.cartesianToSVG(x, y);
  };

  // Inverse of getSVGPositionFromHS
  getHSFromSVGPosition(x, y) {
    const p = this.svgToCartesian(x, y);
    const theta = Math.atan2(p.y, p.x);
    const artisticHue = (theta * (180 / Math.PI) + 360) % 360;
    const scientificHue = this.artisticToScientificSmooth(artisticHue);
    const s = Math.min(Math.sqrt(p.x*p.x + p.y*p.y) / this.options.radius, 1);
    return {h: scientificHue, s: s};
  };

  _getColorsAs(toFunk) {
    return this.getVisibleMarkers().data()
      .sort((a, b) => {
        return a.color.h - b.color.h;
      })
      .map((d) => {
        return tinycolor({h: d.color.h, s: d.color.s, v: d.color.v})[toFunk]();
      });
  };

  getColorsAsHEX() {
    return this._getColorsAs('toHexString');
  };

  getColorsAsRGB() {
    return this._getColorsAs('toRgbString');
  };

  getColorsAsHSL() {
    return this._getColorsAs('toHslString');
  };

  getColorsAsHSV() {
    return this._getColorsAs('toHsvString');
  };

  setMode(mode) {
    this.checkIfModeExists(mode);
    this.currentMode = mode;
    this.setHarmony();
    this.dispatch.call('updateEnd', this);
    this.dispatch.call('modeChanged', this);
  };

  // Utility for building internal classname strings
  cx(className) {
    return this.options.baseClassName + '-' + className;
  };

  selector(className) {
    return '.' + this.cx(className);
  }

  // Simple range mapping function
  // For example, mapRange(5, 0, 10, 0, 100) = 50
  mapRange(value, fromLower, fromUpper, toLower, toUpper) {
    return (toLower + (value - fromLower) * ((toUpper - toLower) / (fromUpper - fromLower)));
  };

  // These two functions are ripped straight from Kuler source.
  // They convert between scientific hue to the color wheel's "artistic" hue.
  artisticToScientificSmooth(hue) {
    return (
      hue < 60  ? hue * (35 / 60):
      hue < 122 ? this.mapRange(hue, 60,  122, 35,  60):
      hue < 165 ? this.mapRange(hue, 122, 165, 60,  120):
      hue < 218 ? this.mapRange(hue, 165, 218, 120, 180):
      hue < 275 ? this.mapRange(hue, 218, 275, 180, 240):
      hue < 330 ? this.mapRange(hue, 275, 330, 240, 300):
                  this.mapRange(hue, 330, 360, 300, 360));
  };

  scientificToArtisticSmooth(hue) {
    return (
      hue < 35  ? hue * (60 / 35):
      hue < 60  ? this.mapRange(hue, 35,  60,  60,  122):
      hue < 120 ? this.mapRange(hue, 60,  120, 122, 165):
      hue < 180 ? this.mapRange(hue, 120, 180, 165, 218):
      hue < 240 ? this.mapRange(hue, 180, 240, 218, 275):
      hue < 300 ? this.mapRange(hue, 240, 300, 275, 330):
                  this.mapRange(hue, 300, 360, 330, 360));
  };

  // Get a hex string from hue and sat components, with 100% brightness.
  hexFromHS(h, s) {
    return tinycolor({h: h, s: s, v: 1}).toHexString();
  };

  // Used to determine the distance from the root marker.
  // (The first DOM node with marker class)
  // Domain: [0, 1,  2, 3,  4, ... ]
  // Range:  [0, 1, -1, 2, -2, ... ]
  markerDistance(i) {
    return Math.ceil(i / 2) * Math.pow(-1, i + 1);
  };

  // Returns a step function with the given base.
  // e.g. with base = 3, returns a function with this domain/range:
  // Domain: [0, 1, 2, 3, 4, 5, ...]
  // Range:  [0, 0, 0, 1, 1, 1, ...]
  stepFn(base) {
    return (x) => { return Math.floor(x / base); }
  };

  // Throw an error if someone gives us a bad mode.
  checkIfModeExists(mode) {
    var modeExists = false;
    for (var possibleMode in ColorWheelPicker.modes) {
      if (ColorWheelPicker.modes[possibleMode] == mode) {
        modeExists = true;
        break;
      }
    }
    if (! modeExists) {
      throw Error('Invalid mode specified: ' + mode);
    }
    return true;
  };

  // For creating custom markers
  createMarker(color, name, show) {
    return new ColorWheelPickerMarkerDatum(color, name, show);
  };


  ready() {
    super.ready();
    this.createElements();
    this.bindData(1);
  }

  static get modes() {
    return {
      CUSTOM: 'Custom',
      ANALOGOUS: 'Analogous',
      COMPLEMENTARY: 'Complementary',
      TRIAD: 'Triad',
      TETRAD: 'Tetrad',
      MONOCHROMATIC: 'Monochromatic',
      SHADES: 'Shades',
    }
  };

  static get template() {
    return html`
      <style>
        :host {
          display: block;
        }
        .ColorWheelPicker {
          position: relative;
          z-index: 1;
          display: block;
          width: 100%;
          height: auto;
          margin: 5px auto 0; }

        .ColorWheelPicker-marker:first-child circle {
          stroke-opacity: 1;
          stroke-width: 5px; }

        .ColorWheelPicker-marker text {
          text-shadow: 1px 1px 1px black, 0 0 3px rgba(0, 0, 0, 0.25); }
          [data-mode=Shades] .ColorWheelPicker-marker text {
            display: none; }

        .ColorWheelPicker-theme {
          display: flex;
          text-align: center;
          max-width: 450px;
          min-width: 350px;
          margin: 5px auto 0; }

        .ColorWheelPicker-theme-swatch {
          flex: 1;
          padding: 0 0.6% 20px; }
          .ColorWheelPicker-theme-swatch input {
            opacity: 0.3; }
          .ColorWheelPicker-theme-swatch:hover input {
            opacity: 0.75; }

        .ColorWheelPicker-theme-color {
          position: relative;
          border-radius: 50%;
          padding-top: 100%;
          box-shadow: 2px 2px 0 black; }

        .ColorWheelPicker-theme-slider {
          position: relative;
          display: block;
          width: 100%;
          margin: 0 0 15px;
          -webkit-appearance: none;
          outline: none;
          background: transparent; }
          .ColorWheelPicker-theme-slider:before {
            content: attr(value) "%";
            display: block;
            position: absolute;
            z-index: -1;
            top: 30px;
            width: 100%;
            font-size: 10px;
            text-align: center;
            color: white;
            text-shadow: 1px 0 1px rgba(0, 0, 0, 0.5); }

        .ColorWheelPicker-theme-value {
          outline: none;
          width: 100%;
          border: none;
          font-family: Monaco, monospace;
          text-align: center;
          background: transparent;
          color: white; }

        .ColorWheelPicker-mode-toggle {
          position: absolute;
          z-index: 2;
          top: 20px;
          right: 20px;
          height: 2em;
          border: none;
          background: #000;
          color: rgba(255, 255, 255, 0.75);
          font-size: 20px; }
          .ColorWheelPicker-mode-toggle:hover {
            color: rgba(255, 255, 255, 0.9); }

        .ColorWheelPicker-gradient {
          z-index: -1;
          opacity: 0.5;
          -webkit-filter: url(#blur);
          filter: url(#blur);
          display: block;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          transform: translateZ(0); }

        /** Trumps */
        ::-webkit-slider-runnable-track {
          -webkit-appearance: none;
          height: 2px;
          border: none;
          margin: 1em 0;
          background: #fff;
          color: #fff; }

        ::-moz-range-track {
          height: 2px;
          border: none;
          margin: 1em 0;
          background: #fff;
          color: #fff; }

        ::-ms-track {
          height: 2px;
          border: none;
          margin: 1em 0;
          background: #fff;
          color: #fff; }

        ::-ms-fill-lower,
        ::-ms-fill-upper,
        ::-ms-ticks-before,
        ::-ms-ticks-after,
        ::-ms-tooltip {
          display: none; }

        ::-webkit-slider-thumb {
          -webkit-appearance: none;
          margin-top: -7px;
          background: black;
          border: 2px solid #fff;
          height: 15px;
          width: 15px;
          border-radius: 99px;
          cursor: ew-resize; }

        ::-moz-range-thumb {
          background: black;
          border: 2px solid #fff;
          height: 15px;
          width: 15px;
          border-radius: 99px;
          cursor: ew-resize; }

        ::-ms-thumb {
          background: black;
          border: 2px solid #fff;
          height: 15px;
          width: 15px;
          border-radius: 99px;
          cursor: ew-resize; }

      </style>
      <div id="container">
        <svg id="svg"></svg>
      </div>

    `;
  }

  static get properties () {
    return {
      point: {
        type: Object,
        observe: '_pointChanged',
      },
      radius:  Number,
      markerWidth: {
        type: Number,
      },
    }
  }
}

window.customElements.define('color-wheel-picker', ColorWheelPicker);
