/*
 * Copyright (C) 2015 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
define(['../../src/WorldWind',
        '../util/GoToBox',
        '../util/LayersPanel',
        '../util/ProjectionMenu',
        '../util/TerrainOpacityController'],
    function (ww,
              GoToBox,
              LayersPanel,
              ProjectionMenu,
              TerrainOpacityController) {
        "use strict";

        var USGSWells = function () {
            WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

            // Create the World Window.
            this.wwd = new WorldWind.WorldWindow("canvasOne");

            // Configure the World Window layers.
            var layers = [
                {layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: true},
                {layer: new WorldWind.OpenStreetMapImageLayer(null), enabled: false},
                {layer: new WorldWind.CompassLayer(), enabled: true, hide: true},
                {layer: new WorldWind.CoordinatesDisplayLayer(this.wwd), enabled: true, hide: true},
                {layer: new WorldWind.ViewControlsLayer(this.wwd), enabled: true, hide: true}
            ];

            for (var l = 0; l < layers.length; l++) {
                layers[l].layer.enabled = layers[l].enabled;
                layers[l].layer.hide = layers[l].hide;
                this.wwd.addLayer(layers[l].layer);
            }

            // Configure the USGS installed well layers.
            var layer = new WorldWind.RenderableLayer("USGS Wells");
            this.addWellShape(33.098751, -117.01714, 270, 30, "Cloverdale\n330555117010101-3\n12S/1W-30J3-5", layer);
            this.addWellShape(33.087345, -116.974756, 340, 30, "Santa Ysabel\n330514116582901-3\n12S/1W-34L2-5", layer);
            this.wwd.addLayer(layer);

            // Enable sub-surface rendering for the World Window.
            this.wwd.subsurfaceMode = true;
            // Enable deep picking in order to detect the sub-surface shapes.
            this.wwd.deepPicking = true;
            // Make the surface semi-transparent in order to see the sub-surface shapes.
            this.wwd.surfaceOpacity = 0.5;

            // Start the view pointing to a location near the well data.
            this.wwd.navigator.lookAtLocation.latitude = 33.0977;
            this.wwd.navigator.lookAtLocation.longitude = -117.0119;
            this.wwd.navigator.range = 1400;
            this.wwd.navigator.heading = 90;
            this.wwd.navigator.tilt = 60;

            // Establish the shapes and the controllers to handle picking.
            this.setupPicking();

            // Create controllers for the user interface elements.
            this.goToBox = new GoToBox(this.wwd);
            this.layersPanel = new LayersPanel(this.wwd);
            this.projectionMenu = new ProjectionMenu(this.wwd);
            this.terrainOpacityController = new TerrainOpacityController(this.wwd);
        };

        USGSWells.prototype.addWellShape = function (latitude, longitude, depthFeet, radiusFeet, displayText, layer) {
            var boundary = [],
                feetToMeters = 0.3048,
                center = new WorldWind.Location(latitude, longitude),
                altitude = -depthFeet * 0.3048,
                radius = radiusFeet * feetToMeters / this.wwd.globe.radiusAt(latitude, longitude),
                numSegments = 32,
                da = 360 / numSegments;

            for (var i = 0, len = numSegments + 1; i < len; i++) {
                var angle = (i != numSegments) ? i * da : 0,
                    position = new WorldWind.Position(0, 0, altitude);
                boundary.push(WorldWind.Location.greatCircleLocation(center, angle, radius, position));
            }

            var polygon = new WorldWind.Polygon([boundary]);
            polygon.pickDelegate = displayText;
            polygon.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
            polygon.extrude = true;
            polygon.attributes.interiorColor = new WorldWind.Color(0.22, 0.65, 0.87, 1.0);
            polygon.attributes.outlineColor = WorldWind.Color.BLUE;
            polygon.attributes.applyLighting = true;
            polygon.highlightAttributes = new WorldWind.ShapeAttributes(polygon.attributes);
            polygon.highlightAttributes.interiorColor = WorldWind.Color.WHITE;
            layer.addRenderable(polygon);

            var placemark = new WorldWind.Placemark(new WorldWind.Position(latitude, longitude, 0));
            placemark.pickDelegate = displayText;
            placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
            placemark.eyeDistanceScaling = true;
            placemark.attributes.imageSource = WorldWind.configuration.baseUrl + "images/white-dot.png";
            placemark.attributes.imageColor = WorldWind.Color.RED;
            placemark.attributes.imageScale = 0.15;
            layer.addRenderable(placemark);
        };

        USGSWells.prototype.setupPicking = function () {
            this.screenText = new WorldWind.ScreenText(new WorldWind.Offset(WorldWind.OFFSET_PIXELS, 0, WorldWind.OFFSET_PIXELS, 0), " ");
            this.screenText.attributes = new WorldWind.TextAttributes();
            this.screenText.attributes.color = WorldWind.Color.YELLOW;
            this.screenText.attributes.offset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0, WorldWind.OFFSET_FRACTION, 0);

            this.textLayer = new WorldWind.RenderableLayer();
            this.textLayer.hide = true;
            this.textLayer.enabled = false;
            this.textLayer.addRenderable(this.screenText);
            this.wwd.addLayer(this.textLayer);

            var handlePick = (function (o) {
                var pickPoint = this.wwd.canvasCoordinates(o.clientX, o.clientY);

                this.textLayer.enabled = false;
                this.wwd.redraw();

                var pickList = this.wwd.pick(pickPoint);
                if (pickList.objects.length > 0) {
                    for (var p = 0; p < pickList.objects.length; p++) {
                        var pickedObject = pickList.objects[p];
                        if (typeof pickedObject.userObject === "string") {
                            this.screenText.screenOffset.x = pickPoint[0];
                            this.screenText.screenOffset.y = this.wwd.viewport.width - pickPoint[1];
                            this.screenText.text = pickedObject.userObject;
                            this.textLayer.enabled = true;
                        }
                    }
                }
            }).bind(this);

            // Listen for mouse moves and highlight the placemarks that the cursor rolls over.
            this.wwd.addEventListener("mousemove", handlePick);

            // Listen for taps on mobile devices and highlight the placemarks that the user taps.
            var tapRecognizer = new WorldWind.TapRecognizer(this.wwd, handlePick);
        };

        return USGSWells;
    });