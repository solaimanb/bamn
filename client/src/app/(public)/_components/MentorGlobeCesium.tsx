/**
 * A 3D globe component that displays mentor locations with hover and click interactions.
 */

'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import throttle from 'lodash/throttle';
import {
    Ion,
    Color,
    Cartesian3,
    Math as CesiumMath,
    CallbackProperty,
    NearFarScalar,
    EntityCollection,
    HorizontalOrigin,
    VerticalOrigin,
    DistanceDisplayCondition,
    Cartesian2,
    ScreenSpaceEventType,
    ScreenSpaceEventHandler,
    HeightReference,
    OpenStreetMapImageryProvider,
    ImageryLayer,
    BillboardGraphics,
    Scene,
    SceneMode,
    Rectangle,
    Camera,
    CameraEventType,
    KeyboardEventModifier,
} from '@cesium/engine';
import { Viewer } from '@cesium/widgets';
import { Mentor } from '@/types/mentor';
import { GlobeVisualization } from '@/types/api';

if (typeof window !== 'undefined') {
    Ion.defaultAccessToken = window.CESIUM_ION_TOKEN || process.env.NEXT_PUBLIC_CESIUM_TOKEN || '';
}

type MentorLocation = Mentor | GlobeVisualization;

interface MentorGlobeCesiumProps {
    mentors?: MentorLocation[];
    onMentorClick?: (mentor: MentorLocation) => void;
}

const PERFORMANCE_CONSTANTS = {
    MOBILE_BREAKPOINT: 768,
    FRAME_RATE_LIMIT: 30,
    HOVER_THROTTLE_MS: 100,
    BATCH_SIZE: 25,
    GRID_SIZE: 2,
    HOVER_RADIUS_PX: 40,
    MOBILE_TILE_SIZE: 256,
    DESKTOP_TILE_SIZE: 512,
    MIN_ZOOM_DISTANCE: 500000,
    MAX_ZOOM_DISTANCE: 25000000,
    CAMERA_BOUNDS: Rectangle.fromDegrees(-180, -85, 180, 85),
    TERRAIN_EXAGGERATION: 1.0,
    CAMERA_MOVEMENT_SPEED: 0.8,
    TOUCH_MOVEMENT_SPEED: 0.3,
    INERTIA_ENABLED: true,
    MOBILE_FRAME_RATE: 30,
    DESKTOP_FRAME_RATE: 60,
    MOBILE_RENDER_THROTTLE: 100,
    DESKTOP_RENDER_THROTTLE: 16,
} as const;

const performanceUtils = {
    setupWebGLContext: (): WebGLRenderingContext | null => {
        try {
            const canvas = document.createElement('canvas');
            const contextAttributes: WebGLContextAttributes = {
                alpha: false,
                depth: true,
                stencil: false,
                antialias: false,
                powerPreference: 'high-performance',
                failIfMajorPerformanceCaveat: true,
                preserveDrawingBuffer: false,
                premultipliedAlpha: true,
                desynchronized: false
            };
            const gl = canvas.getContext('webgl', contextAttributes) as WebGLRenderingContext;

            if (gl) {
                gl.hint(gl.GENERATE_MIPMAP_HINT, gl.FASTEST);
            }

            return gl;
        } catch {
            return null;
        }
    },

    optimizeScene: (scene: Scene, isMobile: boolean) => {
        // Core optimizations
        scene.globe.enableLighting = false;
        scene.globe.showGroundAtmosphere = false;
        scene.globe.showWaterEffect = false;
        scene.globe.backFaceCulling = true;
        scene.globe.tileCacheSize = isMobile ? 15 : 100;
        scene.globe.maximumScreenSpaceError = isMobile ? 4 : 2;
        scene.globe.baseColor = Color.WHITE;
        scene.globe.translucency.enabled = false;
        scene.globe.preloadSiblings = true;
        scene.globe.terrainExaggeration = PERFORMANCE_CONSTANTS.TERRAIN_EXAGGERATION;
        scene.globe.enableLighting = false;
        scene.globe.atmosphereLightIntensity = 0;
        scene.globe.atmosphereHueShift = 0;
        scene.globe.atmosphereSaturationShift = 0;
        scene.globe.atmosphereBrightnessShift = 0;

        // Fog and atmosphere
        scene.fog.enabled = false;
        scene.fog.density = 0;
        scene.skyAtmosphere.show = false;
        scene.sun.show = false;
        scene.moon.show = false;
        scene.skyBox.show = false;

        // Advanced rendering settings
        scene.postProcessStages.fxaa.enabled = !isMobile;
        scene.msaaSamples = isMobile ? 1 : 4;
        scene.requestRenderMode = true;
        scene.maximumRenderTimeChange = isMobile ? 100 : Infinity;

        // Camera constraints and touch optimization
        const controller = scene.screenSpaceCameraController;
        controller.enableCollisionDetection = true;
        controller.minimumZoomDistance = PERFORMANCE_CONSTANTS.MIN_ZOOM_DISTANCE;
        controller.maximumZoomDistance = PERFORMANCE_CONSTANTS.MAX_ZOOM_DISTANCE;
        controller.enableTilt = false;
        controller.minimumCollisionTerrainHeight = 7500;
        controller.bounceAnimationTime = 0.3;
        controller.maximumMovementRatio = isMobile ? 0.15 : 0.3;

        // Touch-specific optimizations
        if (isMobile) {
            controller.inertiaSpin = 0.5;
            controller.inertiaTranslate = 0.5;
            controller.inertiaZoom = 0.4;

            controller.zoomEventTypes = [
                CameraEventType.PINCH,
                {
                    eventType: CameraEventType.WHEEL,
                    modifier: KeyboardEventModifier.SHIFT
                }
            ];

            controller.rotateEventTypes = [
                CameraEventType.LEFT_DRAG,
                CameraEventType.PINCH,
                {
                    eventType: CameraEventType.PINCH,
                    modifier: KeyboardEventModifier.SHIFT
                }
            ];

            controller.translateEventTypes = [
                CameraEventType.LEFT_DRAG,
                {
                    eventType: CameraEventType.LEFT_DRAG,
                    modifier: KeyboardEventModifier.SHIFT
                }
            ];

            controller.enableInputs = true;
            controller.enableZoom = true;
            controller.enableRotate = true;
            controller.enableTilt = false;
            controller.enableLook = false;
        }
    },

    setupCamera: (camera: Camera, isMobile: boolean) => {
        // Optimize camera movement
        camera.defaultMoveAmount = isMobile ?
            PERFORMANCE_CONSTANTS.TOUCH_MOVEMENT_SPEED :
            PERFORMANCE_CONSTANTS.CAMERA_MOVEMENT_SPEED;

        camera.defaultLookAmount = isMobile ? 0.3 : 0.8;
        camera.defaultRotateAmount = isMobile ? 0.3 : 0.8;
        camera.defaultZoomAmount = isMobile ? 0.4 : 0.8;

        // Constrain camera movement
        camera.constrainedAxis = Cartesian3.UNIT_Z;
        camera.maximumZoomFactor = isMobile ? 4 : 6;
    },

    optimizeImageryProvider: (isMobile: boolean) => {
        return new OpenStreetMapImageryProvider({
            url: 'https://a.tile.openstreetmap.org/',
            minimumLevel: 0,
            maximumLevel: isMobile ? 17 : 19,
            credit: ''
        });
    },
};

const getOffsetCoordinates = (
    mentors: MentorLocation[],
    currentMentor: MentorLocation,
    index: number,
    totalOverlapping: number
): { latitude: number; longitude: number } => {
    const overlappingMentors = mentors.filter(
        m => m.latitude === currentMentor.latitude && m.longitude === currentMentor.longitude
    );

    if (overlappingMentors.length <= 1) {
        return {
            latitude: currentMentor.latitude,
            longitude: currentMentor.longitude
        };
    }

    const baseRadius = 0.0001;
    const angle = (2 * Math.PI * index) / Math.max(totalOverlapping, 8);
    const radius = baseRadius * (1 + (index * 0.1));

    return {
        latitude: currentMentor.latitude + (radius * Math.cos(angle)),
        longitude: currentMentor.longitude + (radius * Math.sin(angle))
    };
};

const useMentorClusters = (mentors: MentorLocation[]) => {
    return useMemo(() => {
        const clusters = new Map<string, MentorLocation[]>();

        mentors.forEach(mentor => {
            if (!mentor.latitude || !mentor.longitude) return;

            const key = `${mentor.latitude},${mentor.longitude}`;
            const existing = clusters.get(key) || [];
            clusters.set(key, [...existing, mentor]);
        });

        return clusters;
    }, [mentors]);
};

export default function MentorGlobeCesium({ mentors = [], onMentorClick }: MentorGlobeCesiumProps) {
    const cesiumContainer = useRef<HTMLDivElement>(null);
    const [viewer, setViewer] = useState<Viewer | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [debugStatus, setDebugStatus] = useState<string>('Initializing...');
    const [containerReady, setContainerReady] = useState(false);
    const mentorEntities = useRef<EntityCollection | null>(null);
    const hoverStates = useRef<Map<string, boolean>>(new Map());
    const [selectedMentor, setSelectedMentor] = useState<MentorLocation | null>(null);
    const lastFrameTime = useRef<number>(0);
    const [retryCount, setRetryCount] = useState(0);
    const maxRetries = 3;
    const retryDelay = 2000;
    const mentorClusters = useMentorClusters(mentors);
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < PERFORMANCE_CONSTANTS.MOBILE_BREAKPOINT : false;

    const containerStyle = useMemo<React.CSSProperties>(() => ({
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        width: '100vw',
        height: '100vh',
        margin: '0',
        padding: '0',
        overflow: 'hidden',
        background: 'transparent',
    }), []);

    /** Creates a Cesium entity for a mentor with hover and click interactions */
    const createMentorEntity = useCallback((viewer: Viewer, mentor: MentorLocation) => {
        if (!mentor.latitude || !mentor.longitude) return null;

        const key = `${mentor.latitude},${mentor.longitude}`;
        const locationMentors = mentorClusters.get(key) || [];
        const index = locationMentors.findIndex(m => m.id === mentor.id);
        const { latitude, longitude } = getOffsetCoordinates(
            mentors,
            mentor,
            index,
            locationMentors.length
        );

        const isInCluster = locationMentors.length > 1;

        return viewer.entities.add({
            position: Cartesian3.fromDegrees(longitude, latitude),
            billboard: new BillboardGraphics({
                image: '/gps.png',
                verticalOrigin: VerticalOrigin.BOTTOM,
                horizontalOrigin: HorizontalOrigin.CENTER,
                scale: isInCluster ? 0.2 : 0.3,
                heightReference: HeightReference.RELATIVE_TO_GROUND,
                scaleByDistance: new NearFarScalar(1.5e6, 1.0, 3.0e7, 0.1),
                translucencyByDistance: new NearFarScalar(1.5e6, 1.0, 3.0e7, 1.0),
                disableDepthTestDistance: 0,
                sizeInMeters: false,  // Added to help with texture scaling
                alignedAxis: Cartesian3.ZERO,  // Added to optimize rendering
                pixelOffset: new Cartesian2(0, 0),  // Added for better positioning
                eyeOffset: new Cartesian3(0.0, 0.0, 0.0),  // Added for depth consistency
            }),
            id: mentor.id,
            description: undefined,
            show: true,
            label: {
                text: new CallbackProperty(() => {
                    const isHovered = hoverStates.current.get(mentor.id);
                    if (!isHovered) return '';

                    const text = [
                        mentor.full_name,
                        '──────────',
                        'email' in mentor ? mentor.current_role || 'Mentor' : 'Mentor',
                        'email' in mentor ? mentor.institution || '' : '',
                        'email' in mentor ? `${mentor.city}, ${mentor.country}` : ''
                    ];

                    if (isInCluster) {
                        text.push('──────────');
                        text.push(`+${locationMentors.length - 1} more at this location`);
                    }

                    return text.filter(Boolean).join('\n');
                }, false),
                font: '14px "Inter", system-ui, sans-serif',
                fillColor: Color.fromCssColorString('#000000'),
                outlineWidth: 0,
                style: 0,
                showBackground: true,
                backgroundColor: new Color(1.0, 1.0, 1.0, 1.0),
                backgroundPadding: new Cartesian2(16, 12),
                pixelOffset: new Cartesian2(0, -40),
                horizontalOrigin: HorizontalOrigin.CENTER,
                verticalOrigin: VerticalOrigin.BOTTOM,
                scale: 0.9,
                distanceDisplayCondition: new DistanceDisplayCondition(2.0e6, 2.0e7),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                show: new CallbackProperty(() => false, false),
                heightReference: HeightReference.RELATIVE_TO_GROUND,
                eyeOffset: new Cartesian3(0, 0, -10),
                translucencyByDistance: new NearFarScalar(2.0e6, 1.0, 2.0e7, 0.3)
            }
        });
    }, [mentors, mentorClusters]);

    /** Updates mentor entities and sets up hover interactions */
    useEffect(() => {
        if (!viewer) return;

        if (mentorEntities.current) {
            viewer.entities.removeAll();
            mentorEntities.current = null;
        }

        hoverStates.current.clear();
        mentorEntities.current = new EntityCollection();

        const totalBatches = Math.ceil(mentors.length / PERFORMANCE_CONSTANTS.BATCH_SIZE);
        let processedBatches = 0;

        const processBatch = (startIndex: number) => {
            const endIndex = Math.min(startIndex + PERFORMANCE_CONSTANTS.BATCH_SIZE, mentors.length);
            const batch = mentors.slice(startIndex, endIndex);

            batch.forEach(mentor => {
                createMentorEntity(viewer, mentor);
            });

            processedBatches++;
            if (processedBatches === totalBatches) {
                viewer.scene.requestRender();
            }
        };

        processBatch(0);

        if (totalBatches > 1) {
            let currentBatch = 1;
            const processNextBatch = () => {
                if (currentBatch < totalBatches) {
                    processBatch(currentBatch * PERFORMANCE_CONSTANTS.BATCH_SIZE);
                    currentBatch++;
                    requestAnimationFrame(processNextBatch);
                }
            };
            requestAnimationFrame(processNextBatch);
        }

        const spatialIndex = new Map<string, Set<string>>();

        mentors.forEach(mentor => {
            if (!mentor.latitude || !mentor.longitude) return;
            const gridKey = `${Math.floor(mentor.latitude / PERFORMANCE_CONSTANTS.GRID_SIZE)},${Math.floor(mentor.longitude / PERFORMANCE_CONSTANTS.GRID_SIZE)}`;
            const cell = spatialIndex.get(gridKey) || new Set();
            cell.add(mentor.id);
            spatialIndex.set(gridKey, cell);
        });

        const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

        const throttledUpdateHover = throttle((movement: { endPosition: Cartesian2 }) => {
            if (!movement?.endPosition || !viewer || viewer.isDestroyed()) return;

            const scene = viewer.scene;
            const camera = viewer.camera;
            const ellipsoid = scene.globe.ellipsoid;
            const ray = camera.getPickRay(movement.endPosition);
            if (!ray) return;

            const pickedPosition = scene.globe.pick(ray, scene);
            if (!pickedPosition) return;

            const pickedCartographic = ellipsoid.cartesianToCartographic(pickedPosition);
            const pickedLat = CesiumMath.toDegrees(pickedCartographic.latitude);
            const pickedLon = CesiumMath.toDegrees(pickedCartographic.longitude);

            const gridKey = `${Math.floor(pickedLat / PERFORMANCE_CONSTANTS.GRID_SIZE)},${Math.floor(pickedLon / PERFORMANCE_CONSTANTS.GRID_SIZE)}`;
            const nearbyEntities = spatialIndex.get(gridKey) || new Set();

            let needsUpdate = false;
            const currentHoverStates = new Set<string>();

            viewer.entities.values.forEach(entity => {
                if (!entity.position || !nearbyEntities.has(entity.id as string)) {
                    const currentState = hoverStates.current.get(entity.id as string);
                    if (currentState) {
                        needsUpdate = true;
                        hoverStates.current.set(entity.id as string, false);
                        if (entity.label) {
                            entity.label.show = new CallbackProperty(() => false, false);
                        }
                    }
                    return;
                }

                const position = entity.position.getValue(viewer.clock.currentTime);
                if (!position) return;

                const windowCoords = scene.cartesianToCanvasCoordinates(position);
                if (!windowCoords) return;

                const dx = movement.endPosition.x - windowCoords.x;
                const dy = movement.endPosition.y - windowCoords.y;
                const screenDistance = Math.sqrt(dx * dx + dy * dy);
                const isHovered = screenDistance <= PERFORMANCE_CONSTANTS.HOVER_RADIUS_PX;

                currentHoverStates.add(entity.id as string);

                const currentState = hoverStates.current.get(entity.id as string);
                if (currentState !== isHovered) {
                    needsUpdate = true;
                    hoverStates.current.set(entity.id as string, isHovered);
                    if (entity.label) {
                        entity.label.show = new CallbackProperty(() => isHovered, false);
                    }
                }
            });

            hoverStates.current.forEach((state, id) => {
                if (!currentHoverStates.has(id) && state) {
                    needsUpdate = true;
                    hoverStates.current.set(id, false);
                }
            });

            if (needsUpdate) {
                scene.requestRender();
            }
        }, PERFORMANCE_CONSTANTS.HOVER_THROTTLE_MS, { leading: true, trailing: true });

        handler.setInputAction((movement: { endPosition: Cartesian2 }) => {
            const now = Date.now();
            if (now - lastFrameTime.current < 1000 / PERFORMANCE_CONSTANTS.FRAME_RATE_LIMIT) return;
            lastFrameTime.current = now;

            throttledUpdateHover(movement);
        }, ScreenSpaceEventType.MOUSE_MOVE);

        return () => {
            throttledUpdateHover.cancel();
            if (handler && !viewer.isDestroyed()) {
                handler.destroy();
            }
        };

    }, [viewer, mentors, createMentorEntity]);

    /** Handles click events on mentor points */
    const handleClick = useCallback((movement: { position: Cartesian2 }) => {
        if (!viewer) return;

        const pickedFeature = viewer.scene.pick(movement.position);
        if (pickedFeature && pickedFeature.id && pickedFeature.id.id) {
            const clickedMentor = mentors.find(m => m.id === pickedFeature.id.id);
            if (clickedMentor) {
                if (onMentorClick && !selectedMentor) {
                    onMentorClick(clickedMentor);
                } else {
                    setSelectedMentor(clickedMentor);
                }
            }
        }
    }, [viewer, mentors, onMentorClick, selectedMentor]);

    /** Sets up click handlers for mentor selection */
    useEffect(() => {
        if (!viewer || !viewer.scene || viewer.isDestroyed()) return;

        try {
            const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
            handler.setInputAction(handleClick, ScreenSpaceEventType.LEFT_CLICK);

            return () => {
                if (handler && !handler.isDestroyed()) {
                    handler.destroy();
                }
            };
        } catch (error) {
            console.error('Error setting up click handler:', error);
        }
    }, [viewer, handleClick]);

    /** Initializes container dimensions and sets up resize observer */
    useEffect(() => {
        const container = cesiumContainer.current;
        if (!container) return;

        const checkContainer = () => {
            const { offsetWidth, offsetHeight } = container;
            if (offsetWidth > 0 && offsetHeight > 0) {
                setContainerReady(true);
                return true;
            }
            return false;
        };

        if (!checkContainer()) {
            const observer = new ResizeObserver(() => {
                if (checkContainer()) {
                    observer.disconnect();
                }
            });

            observer.observe(container);
            return () => observer.disconnect();
        }
    }, []);

    /** Initializes Cesium viewer and sets up click handlers */
    useEffect(() => {
        const container = cesiumContainer.current;
        if (!containerReady || !container) return;

        let mounted = true;
        let currentViewer: Viewer | null = null;

        const initCesium = async (retryAttempt = 0) => {
            try {
                if (currentViewer) {
                    if (!currentViewer.isDestroyed()) {
                        currentViewer.destroy();
                    }
                    currentViewer = null;
                    setViewer(null);
                }

                setDebugStatus('Checking WebGL support...');
                const gl = performanceUtils.setupWebGLContext();
                if (!gl) {
                    throw new Error('WebGL is not supported or enabled on your browser.');
                }

                setDebugStatus('Initializing globe...');
                window.CESIUM_BASE_URL = '/cesium';

                if (!Ion.defaultAccessToken) {
                    Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_TOKEN!;
                }

                if (retryAttempt > 0) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }

                if (!mounted) return;

                const viewer = new Viewer(container, {
                    animation: false,
                    baseLayerPicker: false,
                    fullscreenButton: false,
                    geocoder: false,
                    homeButton: false,
                    infoBox: false,
                    sceneModePicker: false,
                    selectionIndicator: false,
                    timeline: false,
                    navigationHelpButton: false,
                    navigationInstructionsInitiallyVisible: false,
                    scene3DOnly: true,
                    requestRenderMode: true,
                    maximumRenderTimeChange: Infinity,
                    targetFrameRate: isMobile ? 60 : 60,
                    terrain: undefined,
                    baseLayer: new ImageryLayer(
                        performanceUtils.optimizeImageryProvider(isMobile),
                        {}
                    ),
                    contextOptions: {
                        webgl: {
                            alpha: false,
                            depth: true,
                            stencil: false,
                            antialias: !isMobile,
                            powerPreference: 'high-performance',
                            preserveDrawingBuffer: false,
                            failIfMajorPerformanceCaveat: false
                        }
                    },
                    orderIndependentTranslucency: false,
                    sceneMode: SceneMode.SCENE3D,
                });

                currentViewer = viewer;

                if (!mounted) {
                    viewer.destroy();
                    return;
                }

                // Remove default handlers before adding our own
                if (viewer.cesiumWidget && viewer.cesiumWidget.screenSpaceEventHandler) {
                    viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
                    viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
                }

                const scene = viewer.scene;
                scene.globe.enableLighting = false;
                scene.globe.baseColor = Color.WHITE;
                scene.backgroundColor = Color.WHITE;
                scene.moon.show = false;
                scene.skyBox.show = false;
                scene.sun.show = false;
                scene.skyAtmosphere.show = false;
                scene.globe.showGroundAtmosphere = false;
                scene.globe.show = true;
                scene.globe.enableLighting = false;
                scene.globe.translucency.enabled = false;

                if (isMobile) {
                    scene.globe.maximumScreenSpaceError = 4;
                    scene.fog.enabled = false;
                    scene.fog.density = 0;
                    scene.postProcessStages.fxaa.enabled = false;
                    scene.globe.backFaceCulling = true;
                    scene.globe.tileCacheSize = 25;
                }

                scene.globe.preloadSiblings = false;
                scene.globe.tileCacheSize = isMobile ? 25 : 100;

                container.style.position = 'fixed';
                container.style.inset = '0';
                container.style.width = '100vw';
                container.style.height = '100vh';
                container.style.margin = '0';
                container.style.padding = '0';
                container.style.overflow = 'hidden';
                container.style.background = 'white';

                const viewerContainer = viewer.container as HTMLElement;
                viewerContainer.style.position = 'absolute';
                viewerContainer.style.inset = '0';
                viewerContainer.style.width = '100%';
                viewerContainer.style.height = '100%';
                viewerContainer.style.margin = '0';
                viewerContainer.style.padding = '0';
                viewerContainer.style.background = 'white';

                const canvas = viewer.canvas;
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.position = 'absolute';
                canvas.style.top = '0';
                canvas.style.left = '0';
                canvas.style.background = 'white';

                viewer.resize();
                setTimeout(() => {
                    if (mounted && viewer && !viewer.isDestroyed()) {
                        viewer.resize();
                        scene.requestRender();
                    }
                }, 100);

                const creditContainer = viewer.creditDisplay.container as HTMLElement;
                creditContainer.style.display = 'none';

                viewer.camera.setView({
                    destination: Cartesian3.fromDegrees(0, 20, 20000000),
                    orientation: {
                        heading: 0.0,
                        pitch: -CesiumMath.PI_OVER_TWO,
                        roll: 0.0
                    }
                });

                scene.requestRender();

                if (process.env.NODE_ENV === 'development') {
                    viewer.scene.debugShowFramesPerSecond = false;
                }

                setViewer(viewer);
                setIsLoading(false);
                setError(null);
                setRetryCount(0);

                performanceUtils.optimizeScene(viewer.scene, isMobile);
                performanceUtils.setupCamera(viewer.camera, isMobile);

                if (isMobile) {
                    viewer.scene.globe.enableLighting = false;
                    viewer.resolutionScale = 1.0;
                }

            } catch (error) {
                console.error('Error initializing Cesium:', error);

                if (currentViewer) {
                    if (!currentViewer.isDestroyed()) {
                        currentViewer.destroy();
                    }
                    currentViewer = null;
                    setViewer(null);
                }

                if (mounted && retryAttempt < maxRetries) {
                    setDebugStatus(`Retrying initialization (Attempt ${retryAttempt + 1}/${maxRetries})...`);
                    setRetryCount(retryAttempt + 1);
                    await initCesium(retryAttempt + 1);
                } else if (mounted) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to initialize the globe';
                    setError(`Failed to load globe: ${errorMessage}. Please try refreshing the page.`);
                    setIsLoading(false);
                }
            }
        };

        initCesium();

        return () => {
            mounted = false;
            if (currentViewer) {
                if (!currentViewer.isDestroyed()) {
                    currentViewer.destroy();
                }
                currentViewer = null;
                setViewer(null);
            }
        };
    }, [containerReady, isMobile]);

    // Add memory management
    const cleanupResources = useCallback(() => {
        if (!viewer) return;

        // Clear entity references
        mentorEntities.current = null;
        hoverStates.current.clear();

        // Clear memory and force re-render
        viewer.scene.globe.tileCacheSize = 0;
        viewer.scene.requestRender();
    }, [viewer]);

    // Add periodic cleanup for mobile
    useEffect(() => {
        if (!isMobile || !viewer) return;

        const interval = setInterval(cleanupResources, 60000); // Every minute
        return () => clearInterval(interval);
    }, [isMobile, viewer, cleanupResources]);

    if (!containerReady) {
        return (
            <div
                ref={cesiumContainer}
                className="fixed inset-0 w-screen h-screen bg-white"
                style={containerStyle}
            />
        );
    }

    if (isLoading) {
        return (
            <div
                ref={cesiumContainer}
                className="fixed inset-0 w-screen h-screen bg-white"
                style={containerStyle}
            >
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-center">
                        <div className="mb-2">Loading 3D Globe{retryCount > 0 ? ` (Attempt ${retryCount}/${maxRetries})` : ''}...</div>
                        <div className="text-sm text-gray-400">{debugStatus}</div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white p-4">
                <div className="max-w-md text-center">
                    <h3 className="text-xl font-semibold mb-4">Globe Loading Error</h3>
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={() => {
                            setError(null);
                            setIsLoading(true);
                            setRetryCount(0);
                            setDebugStatus('Retrying initialization...');
                            window.location.reload();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Retry Loading
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div
                ref={cesiumContainer}
                className="fixed inset-0 w-screen h-screen"
                style={containerStyle}
            >
                <style jsx global>{`
                    .cesium-viewer :is(.cesium-label, .cesium-label-background) {
                        border-radius: 8px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                        transition: opacity 0.2s ease-in-out;
                    }
                `}</style>
            </div>
        </>
    );
} 