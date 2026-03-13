"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { GLOBAL_RENDER_EFFECTS } from "./effects/globalRenderEffects";
import { incrementRawScore } from "@/lib/inference-store";

const PLATFORM_TEXTURE_WIDTH = 1536;
const PLATFORM_TEXTURE_HEIGHT = 1024;
const CREATURE_TEXTURE_WIDTH = 1024;
const CREATURE_TEXTURE_HEIGHT = 1024;
const CREATURE_CONTACT_RATIO = 0.364;
const PLATFORM_SURFACE_RATIO = -0.08;
const PLATFORM_GAP_RATIO = 0.1;
const CREATURE_BASE_KEY = "creature_base";
const CREATURE_EYES_OPEN_KEY = "creature_eyes_open";
const CREATURE_EYES_CLOSED_KEY = "creature_eyes_closed";
const CREATURE_LOOKS_RIGHT_KEY = "creature_looks_right";
const CREATURE_LOOKS_UP_LEFT_KEY = "creature_looks_up_left";
const CREATURE_IDLE_LOOKS_DOWN_KEY = "creature_idle_looks_down";
const CREATURE_IDLE_ANNOYED_KEY = "creature_idle_annoyed";
const CREATURE_FLUTTER_SMALL_KEY = "creature_flutter_small";
const CREATURE_FLUTTER_MID_KEY = "creature_flutter_mid";
const CREATURE_FLUTTER_LARGE_KEY = "creature_flutter_large";
const CREATURE_YAWN_00_KEY = "creature_yawn_00";
const CREATURE_YAWN_01_KEY = "creature_yawn_01";
const CREATURE_YAWN_02_KEY = "creature_yawn_02";
const CREATURE_YAWN_03_KEY = "creature_yawn_03";
const CREATURE_ACTION_JUMP_00_KEY = "creature_action_jump_00";
const CREATURE_IDLE_SLEEPING_KEY = "creature_idle_sleeping";
const ENERGY_PARTICLE_KEY = "energy_particle";
const ENERGY_PARTICLE_FALLBACK_KEY = "energy_particle_fallback";
const SNORE_PARTICLE_FALLBACK_KEY = "snore_particle_fallback";
const CREATURE_FLUTTER_KEYS = [CREATURE_FLUTTER_SMALL_KEY, CREATURE_FLUTTER_MID_KEY, CREATURE_FLUTTER_LARGE_KEY];
const CREATURE_YAWN_KEYS = [
  CREATURE_YAWN_00_KEY,
  CREATURE_YAWN_01_KEY,
  CREATURE_YAWN_02_KEY,
  CREATURE_YAWN_03_KEY,
];

const BLINK_INTERVAL_MIN_MS = 2400;
const BLINK_INTERVAL_MAX_MS = 5600;
const BLINK_DOUBLE_CHANCE = 0.22;
const BLINK_CLOSE_MIN_MS = 40;
const BLINK_CLOSE_MAX_MS = 68;
const BLINK_HOLD_MIN_MS = 28;
const BLINK_HOLD_MAX_MS = 56;
const BLINK_OPEN_MIN_MS = 52;
const BLINK_OPEN_MAX_MS = 94;
const BLINK_DOUBLE_PAUSE_MIN_MS = 70;
const BLINK_DOUBLE_PAUSE_MAX_MS = 130;
const BLINK_SQUASH_RATIO = 0.984;
const BLINK_BUSY_RETRY_MIN_MS = 1200;
const BLINK_BUSY_RETRY_MAX_MS = 2200;
const BLINK_AFTER_ACTION_MIN_MS = 1000;
const BLINK_AFTER_ACTION_MAX_MS = 1900;

const YAWN_INTERVAL_MIN_MS = 14000;
const YAWN_INTERVAL_MAX_MS = 26000;
const YAWN_ENTER_MIN_MS = 90;
const YAWN_ENTER_MAX_MS = 145;
const YAWN_HOLD_MIN_MS = 850;
const YAWN_HOLD_MAX_MS = 1500;
const YAWN_EXIT_MIN_MS = 110;
const YAWN_EXIT_MAX_MS = 170;
const LOOK_INTERVAL_MIN_MS = 4600;
const LOOK_INTERVAL_MAX_MS = 9200;
const LOOK_SIDE_TWEEN_MIN_MS = 120;
const LOOK_SIDE_TWEEN_MAX_MS = 190;
const LOOK_UP_TWEEN_MIN_MS = 135;
const LOOK_UP_TWEEN_MAX_MS = 210;
const LOOK_HOLD_MIN_MS = 520;
const LOOK_HOLD_MAX_MS = 1240;
const LOOK_RETURN_TWEEN_MIN_MS = 150;
const LOOK_RETURN_TWEEN_MAX_MS = 230;
const LOOK_MIRROR_TWEEN_MIN_MS = 140;
const LOOK_MIRROR_TWEEN_MAX_MS = 220;
const LOOK_DOWN_CHANCE = 0.24;
const LOOK_ANNOYED_CHANCE = 0.18;
const FLUTTER_INTERVAL_MIN_MS = 6200;
const FLUTTER_INTERVAL_MAX_MS = 13200;
const FLUTTER_STEP_MIN_MS = 52;
const FLUTTER_STEP_MAX_MS = 88;
const FLUTTER_PEAK_HOLD_MIN_MS = 72;
const FLUTTER_PEAK_HOLD_MAX_MS = 128;
const JUMP_INTERVAL_MIN_MS = 8200;
const JUMP_INTERVAL_MAX_MS = 16200;
const JUMP_RETRY_MIN_MS = 1200;
const JUMP_RETRY_MAX_MS = 2200;
const JUMP_CROUCH_MIN_MS = 95;
const JUMP_CROUCH_MAX_MS = 145;
const JUMP_LAUNCH_MIN_MS = 115;
const JUMP_LAUNCH_MAX_MS = 168;
const JUMP_APEX_HOLD_MIN_MS = 100;
const JUMP_APEX_HOLD_MAX_MS = 170;
const JUMP_DESCEND_MIN_MS = 120;
const JUMP_DESCEND_MAX_MS = 185;
const JUMP_LAND_MIN_MS = 85;
const JUMP_LAND_MAX_MS = 130;
const JUMP_RECOVER_MIN_MS = 165;
const JUMP_RECOVER_MAX_MS = 245;
const WAKE_AFTER_TAP_MS = 15000;
const WAKE_AFTER_TASK_COMPLETE_MS = 3200;
const SLEEP_RETRY_MIN_MS = 2000;
const SLEEP_RETRY_MAX_MS = 3200;
const SLEEP_SETTLE_MIN_MS = 460;
const SLEEP_SETTLE_MAX_MS = 760;
const SLEEP_WAKE_MIN_MS = 240;
const SLEEP_WAKE_MAX_MS = 340;
const SLEEP_BREATHE_MIN_MS = 1800;
const SLEEP_BREATHE_MAX_MS = 2400;
const SLEEP_NOD_MIN_MS = 2400;
const SLEEP_NOD_MAX_MS = 3400;
const SLEEP_DRIFT_MIN_MS = 2200;
const SLEEP_DRIFT_MAX_MS = 3200;
const SWIPE_MIN_DELTA_PX = 4;
const SWIPE_REQUIRED_ALTERNATIONS = 1;
const ENERGY_CHARGE_GAIN_PER_ALTERNATION = 0.55;
const ENERGY_CHARGE_GAIN_PER_STROKE = 0.18;
const ENERGY_CHARGE_DECAY_PER_SEC = 0.1;
const ENERGY_MIN_ACTIVE_CHARGE = 0.005;

const ULTRA_MODE = {
  enabled: true,
  idleStrength: 1,
  resizeLambda: 10.5,
  creatureFollowLambda: 14.5,
  platformFollowLambda: 10.8,
  angleLambda: 15.5,
  angleReturnLambda: 13.5,
  scaleLambda: 15.5,
  blinkRestoreLambda: 30,
  eyeCrossfadeMs: 52,
  flutterCrossfadeMs: 58,
  lookCrossfadeMs: 72,
  yawnCrossfadeMs: 82,
  jumpCrossfadeMs: 68,
  sleepCrossfadeMs: 88,
  yawnShiftPx: 3.6,
  yawnAngleDeg: 2.25,
  yawnStretchX: 0.024,
  yawnStretchY: 0.031,
  sleepBreatheStretchX: 0.012,
  sleepBreatheStretchY: 0.036,
  sleepBreatheLiftPx: 2.6,
  sleepNodAngleDeg: 1.4,
  sleepCameraZoomAmp: 0.0024,
  trailFollowLambda: 18,
  trailBaseAlpha: 0.04,
  trailMaxAlpha: 0.08,
  trailVelocityFactor: 0.00012,
  cameraLambda: 8.8,
  cameraDriftPx: 2.1,
  cameraLookParallax: 0.26,
  cameraYawnParallax: 0.58,
  cameraZoomIdleAmp: 0.0028,
  cameraZoomYawnAmp: 0.0042,
} as const;

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

type RgbTriplet = { r: number; g: number; b: number };

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function blendChannel(channel: number, target: number, weight: number) {
  return clampByte(channel + (target - channel) * weight);
}

function recordPetInteraction() {
  const raw = incrementRawScore();
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("zyndrel-pet", { detail: { raw } }));
}

function sampleImageColor(sourceImage: unknown) {
  if (typeof document === "undefined" || !sourceImage) return null;

  const sampleCanvas = document.createElement("canvas");
  const sampleSize = 36;
  sampleCanvas.width = sampleSize;
  sampleCanvas.height = sampleSize;
  const ctx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  try {
    ctx.drawImage(sourceImage as CanvasImageSource, 0, 0, sampleSize, sampleSize);
  } catch {
    return null;
  }

  let red = 0;
  let green = 0;
  let blue = 0;
  let totalAlpha = 0;
  const pixels = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    if (alpha <= 0) continue;
    red += pixels[index] * alpha;
    green += pixels[index + 1] * alpha;
    blue += pixels[index + 2] * alpha;
    totalAlpha += alpha;
  }

  if (totalAlpha <= 0) return null;

  return {
    r: clampByte(red / totalAlpha),
    g: clampByte(green / totalAlpha),
    b: clampByte(blue / totalAlpha),
  } satisfies RgbTriplet;
}

type LookPose =
  | "center"
  | "left"
  | "right"
  | "up-left"
  | "up-right"
  | "down-left"
  | "down-right"
  | "annoyed-left"
  | "annoyed-right";

type LookStep = {
  frameKey: string | null;
  flipX: boolean;
  pose: LookPose;
  tweenMs: number;
  holdMs?: number;
};

type CronJobState = {
  running?: boolean;
  isRunning?: boolean;
  status?: string;
};

type CronJob = {
  state?: CronJobState;
};

type CronPayload = {
  jobs?: CronJob[];
};

function hasRunningTask(payload: CronPayload) {
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];
  return jobs.some((job) => {
    const state = job?.state;
    return Boolean(state?.running || state?.isRunning || state?.status === "running");
  });
}

function getMainScene(game: Phaser.Game | null) {
  if (!game) return null;
  try {
    return game.scene.getScene("main") as MainScene;
  } catch {
    return null;
  }
}

class MainScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.Image;
  private platform!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Ellipse;
  private shadowSoft!: Phaser.GameObjects.Ellipse;
  private creature!: Phaser.GameObjects.Image;
  private creatureBlend!: Phaser.GameObjects.Image;
  private creatureTrail!: Phaser.GameObjects.Image;
  private energyEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private sleepSnoreEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private energyCharge = 0;
  private energyIsActive = false;
  private swipePointerId: number | null = null;
  private swipeLastX = 0;
  private swipeLastDirection = 0;
  private swipeAlternations = 0;

  private centerX = 0;
  private centerY = 0;
  private centerXTarget = 0;
  private centerYTarget = 0;
  private backgroundScale = 1;
  private backgroundScaleTarget = 1;

  private baseCreatureY = 0;
  private baseCreatureYTarget = 0;
  private basePlatformY = 0;
  private basePlatformYTarget = 0;

  private creatureScaleX = 1;
  private creatureScaleY = 1;
  private creatureScaleXTarget = 1;
  private creatureScaleYTarget = 1;

  private platformScaleX = 1;
  private platformScaleY = 1;
  private platformScaleXTarget = 1;
  private platformScaleYTarget = 1;

  private shadowWidth = 220;
  private shadowHeight = 48;
  private shadowWidthTarget = 220;
  private shadowHeightTarget = 48;

  private creatureX = 0;
  private creatureY = 0;
  private platformX = 0;
  private platformY = 0;

  private trailX = 0;
  private trailY = 0;
  private previousCreatureX = 0;
  private previousCreatureY = 0;

  private creatureAngle = 0;
  private blinkSquashY = 1;
  private blinkNeedsRestore = false;
  private blinkRestoreMinRemainingMs = 0;
  private blinkRestoreOnComplete: (() => void) | null = null;

  private yawnPoseValue = 0;
  private yawnPoseProxy = { value: 0 };
  private yawnReturnBias = 0;
  private jumpPoseProxy = { height: 0, stretchX: 0, stretchY: 0, angle: 0, driftX: 0, platformDip: 0 };
  private sleepPoseProxy = { settle: 0, breathe: 0, nod: 0, driftX: 0, driftY: 0, platformDip: 0, shadowPulse: 0 };

  private hasInitialLayout = false;
  private isCrossfading = false;
  private crossfadeElapsed = 0;
  private crossfadeDuration = ULTRA_MODE.eyeCrossfadeMs / 1000;
  private currentCreatureKey = CREATURE_BASE_KEY;
  private currentCreatureFlipX = false;
  private cameraScrollX = 0;
  private cameraScrollY = 0;
  private cameraScrollXTarget = 0;
  private cameraScrollYTarget = 0;
  private cameraZoom = 1;
  private cameraZoomTarget = 1;

  private blinkTimer: Phaser.Time.TimerEvent | null = null;
  private blinkTween: Phaser.Tweens.Tween | null = null;
  private lookTimer: Phaser.Time.TimerEvent | null = null;
  private lookStepTimer: Phaser.Time.TimerEvent | null = null;
  private lookTween: Phaser.Tweens.Tween | null = null;
  private yawnTimer: Phaser.Time.TimerEvent | null = null;
  private yawnStepTimer: Phaser.Time.TimerEvent | null = null;
  private yawnTween: Phaser.Tweens.Tween | null = null;
  private flutterTimer: Phaser.Time.TimerEvent | null = null;
  private flutterStepTimer: Phaser.Time.TimerEvent | null = null;
  private jumpTimer: Phaser.Time.TimerEvent | null = null;
  private jumpTween: Phaser.Tweens.BaseTween | null = null;
  private sleepTimer: Phaser.Time.TimerEvent | null = null;
  private sleepSettleTween: Phaser.Tweens.Tween | null = null;
  private sleepBreatheTween: Phaser.Tweens.Tween | null = null;
  private sleepNodTween: Phaser.Tweens.Tween | null = null;
  private sleepDriftTween: Phaser.Tweens.Tween | null = null;

  private isEyesClosed = false;
  private isBlinking = false;
  private isLooking = false;
  private isYawning = false;
  private isFluttering = false;
  private isJumping = false;
  private isSleeping = false;
  private hasActiveTask = false;
  private lookFrameKey: string | null = null;
  private lookFlipX = false;
  private lookPoseProxy = { x: 0, y: 0, angle: 0 };
  private yawnFrameIndex = 0;
  private flutterFrameIndex = 0;
  private readonly onCreaturePointerDown = (pointer: Phaser.Input.Pointer) => {
    recordPetInteraction();
    if (this.isSleeping) {
      this.wakeFromSleep(true);
      return;
    }
    if (!this.hasActiveTask) {
      this.scheduleNextSleep(WAKE_AFTER_TAP_MS);
    }
    this.energyCharge = Math.max(this.energyCharge, 0.34);
    this.beginSwipeTracking(pointer);
    const sideIsLeft = pointer.worldX < this.creatureX;
    this.playTapLookDownSequence(sideIsLeft);
  };
  private readonly onScenePointerMove = (pointer: Phaser.Input.Pointer) => {
    if (!pointer.isDown || this.swipePointerId !== pointer.id) return;

    const deltaX = pointer.worldX - this.swipeLastX;
    if (Math.abs(deltaX) < SWIPE_MIN_DELTA_PX) return;

    const direction = deltaX > 0 ? 1 : -1;
    if (this.swipeLastDirection !== 0 && direction !== this.swipeLastDirection) {
      this.swipeAlternations += 1;
      if (this.swipeAlternations >= SWIPE_REQUIRED_ALTERNATIONS) {
        this.energyCharge = Phaser.Math.Clamp(this.energyCharge + ENERGY_CHARGE_GAIN_PER_ALTERNATION, 0, 1);
      }
    } else if (this.swipeAlternations >= SWIPE_REQUIRED_ALTERNATIONS) {
      this.energyCharge = Phaser.Math.Clamp(this.energyCharge + ENERGY_CHARGE_GAIN_PER_STROKE, 0, 1);
    }

    this.swipeLastDirection = direction;
    this.swipeLastX = pointer.worldX;
  };
  private readonly onScenePointerUp = (pointer: Phaser.Input.Pointer) => {
    this.endSwipeTracking(pointer.id);
  };

  private readonly bobAmplitudeY = 14;
  private readonly bobOmega = 1.6;

  constructor() {
    super("main");
  }

  preload() {
    this.load.image("environment", "/environments/environment.png");
    this.load.image("platform", "/platforms/platform.png");
    this.load.image(CREATURE_BASE_KEY, "/zyndrel.png");
    this.load.image(CREATURE_EYES_OPEN_KEY, "/zyndrel/animations/Idle/blink/zyndrel-idle_01.PNG");
    this.load.image(CREATURE_EYES_CLOSED_KEY, "/zyndrel/animations/Idle/blink/zyndrel-idle_00.png");
    this.load.image(CREATURE_LOOKS_RIGHT_KEY, "/zyndrel/animations/Idle/zyndrel-idle-looks-right_00.png");
    this.load.image(CREATURE_LOOKS_UP_LEFT_KEY, "/zyndrel/animations/Idle/zyndrel-idle-looks-up-left_00.png");
    this.load.image(
      CREATURE_IDLE_LOOKS_DOWN_KEY,
      "/zyndrel/animations/Idle/%20attention/zyndrel-idle-looks-down_00.png",
    );
    this.load.image(CREATURE_IDLE_ANNOYED_KEY, "/zyndrel/animations/Idle/annoyed/zyndrel-idle-turned-head_00.png");
    this.load.image(CREATURE_FLUTTER_SMALL_KEY, "/zyndrel/animations/Idle/flutter/zyndrel-idle-flutter-small_01.png");
    this.load.image(CREATURE_FLUTTER_MID_KEY, "/zyndrel/animations/Idle/flutter/zyndrel-idle-flutter-mid_02.png");
    this.load.image(CREATURE_FLUTTER_LARGE_KEY, "/zyndrel/animations/Idle/flutter/zyndrel-idle-flutter-large_03.png");
    this.load.image(CREATURE_YAWN_00_KEY, "/zyndrel/animations/yawn/zyndrel-yawn_00.png");
    this.load.image(CREATURE_YAWN_01_KEY, "/zyndrel/animations/yawn/zyndrel-yawn_01.png");
    this.load.image(CREATURE_YAWN_02_KEY, "/zyndrel/animations/yawn/zyndrel-yawn_02.png");
    this.load.image(CREATURE_YAWN_03_KEY, "/zyndrel/animations/yawn/zyndrel-yawn_03.png");
    this.load.image(CREATURE_ACTION_JUMP_00_KEY, "/zyndrel/animations/action/jump/zyndrel-action-jump_00.png");
    this.load.image(CREATURE_IDLE_SLEEPING_KEY, "/zyndrel/animations/Idle/sleeping/zyndrel-idle-sleeping_00.png");
    this.load.svg(ENERGY_PARTICLE_KEY, "/particles/energy-orb.svg");
  }

  create() {
    const initialCreatureKey = this.resolveCreatureTextureKey();
    this.currentCreatureKey = initialCreatureKey;

    this.background = this.add.image(0, 0, "environment").setOrigin(0.5).setDepth(0);
    this.syncEnvironmentChromeTheme();
    this.shadowSoft = this.add.ellipse(0, 0, 1, 1, 0x000000, 0.13).setDepth(1);
    this.shadow = this.add.ellipse(0, 0, 1, 1, 0x000000, 0.28).setDepth(1.1);
    this.platform = this.add.image(0, 0, "platform").setOrigin(0.5).setDepth(2);

    // Trail is a lightweight second copy that lags by a small damped offset.
    this.creatureTrail = this.add.image(0, 0, initialCreatureKey).setOrigin(0.5).setDepth(2.7).setAlpha(0.06);
    this.creature = this.add.image(0, 0, initialCreatureKey).setOrigin(0.5).setDepth(3);

    // Blend layer enables 40-60ms eye-state crossfades with no texture popping.
    this.creatureBlend = this.add
      .image(0, 0, initialCreatureKey)
      .setOrigin(0.5)
      .setDepth(3.1)
      .setAlpha(0)
      .setVisible(false);
    const energyTextureKey = this.resolveEnergyParticleTextureKey();
    this.energyEmitter = this.add
      .particles(0, 0, energyTextureKey, {
        emitting: false,
        frequency: 34,
        quantity: 4,
        lifespan: { min: 820, max: 1460 },
        speedX: { min: -128, max: 128 },
        speedY: { min: -262, max: -88 },
        accelerationY: -28,
        scale: { start: 0.4, end: 0 },
        alpha: { start: 0.94, end: 0 },
        rotate: { min: -220, max: 220 },
        x: { min: -34, max: 34 },
        y: { min: 2, max: 24 },
        tint: [0xb7f6ff, 0x58d7ff, 0x1f8eff],
        blendMode: Phaser.BlendModes.SCREEN,
      })
      .setDepth(4.4);
    const snoreTextureKey = this.resolveSnoreParticleTextureKey();
    this.sleepSnoreEmitter = this.add
      .particles(0, 0, snoreTextureKey, {
        emitting: false,
        frequency: 520,
        quantity: 1,
        lifespan: { min: 1200, max: 1800 },
        speedX: { min: 7, max: 18 },
        speedY: { min: -30, max: -14 },
        accelerationY: -4,
        scale: { start: 0.12, end: 0.46 },
        alpha: { start: 0.45, end: 0 },
        rotate: { min: -18, max: 22 },
        x: { min: -4, max: 4 },
        y: { min: -4, max: 5 },
        tint: [0xe8f2ff, 0xf5fbff],
        blendMode: Phaser.BlendModes.SCREEN,
      })
      .setDepth(4.5);
    this.creature.setInteractive({ useHandCursor: true });
    this.creature.on("pointerdown", this.onCreaturePointerDown);
    this.creatureBlend.setInteractive({ useHandCursor: true });
    this.creatureBlend.on("pointerdown", this.onCreaturePointerDown);
    this.input.on("pointermove", this.onScenePointerMove);
    this.input.on("pointerup", this.onScenePointerUp);
    this.input.on("pointerupoutside", this.onScenePointerUp);

    const camera = this.cameras.main;
    camera.setRoundPixels(false);
    camera.setZoom(1);
    camera.setScroll(0, 0);

    this.layout(this.scale.gameSize);
    this.scheduleNextBlink();
    this.scheduleNextLook();
    this.scheduleNextYawn();
    this.scheduleNextFlutter();
    this.scheduleNextJump();
    this.playSleepSequence();
    this.scale.on("resize", this.layout, this);

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopBlinkLoop();
      this.stopLookLoop();
      this.stopYawnLoop();
      this.stopFlutterLoop();
      this.stopJumpLoop();
      this.stopSleepLoop();
      this.energyEmitter?.stop();
      this.energyEmitter?.destroy();
      this.energyEmitter = null;
      this.sleepSnoreEmitter?.stop();
      this.sleepSnoreEmitter?.destroy();
      this.sleepSnoreEmitter = null;
      this.energyCharge = 0;
      this.energyIsActive = false;
      this.endSwipeTracking();
      this.creature.off("pointerdown", this.onCreaturePointerDown);
      this.creature.disableInteractive();
      this.creatureBlend.off("pointerdown", this.onCreaturePointerDown);
      this.creatureBlend.disableInteractive();
      this.input.off("pointermove", this.onScenePointerMove);
      this.input.off("pointerup", this.onScenePointerUp);
      this.input.off("pointerupoutside", this.onScenePointerUp);
      this.scale.off("resize", this.layout, this);
    });
  }

  private syncEnvironmentChromeTheme() {
    if (typeof document === "undefined") return;

    const environmentTexture = this.textures.get("environment");
    if (!environmentTexture) return;

    const sampled = sampleImageColor(environmentTexture.getSourceImage());
    if (!sampled) return;

    const stroke = {
      r: blendChannel(sampled.r, 255, 0.5),
      g: blendChannel(sampled.g, 255, 0.5),
      b: blendChannel(sampled.b, 255, 0.5),
    };
    const surface = {
      r: blendChannel(sampled.r, 8, 0.82),
      g: blendChannel(sampled.g, 10, 0.82),
      b: blendChannel(sampled.b, 16, 0.82),
    };
    const highlight = {
      r: blendChannel(sampled.r, 255, 0.3),
      g: blendChannel(sampled.g, 255, 0.3),
      b: blendChannel(sampled.b, 255, 0.3),
    };
    const glow = {
      r: blendChannel(sampled.r, 220, 0.42),
      g: blendChannel(sampled.g, 228, 0.42),
      b: blendChannel(sampled.b, 236, 0.42),
    };

    const root = document.documentElement;
    root.style.setProperty("--environment-rgb", `${sampled.r} ${sampled.g} ${sampled.b}`);
    root.style.setProperty("--chrome-stroke-rgb", `${stroke.r} ${stroke.g} ${stroke.b}`);
    root.style.setProperty("--chrome-surface-rgb", `${surface.r} ${surface.g} ${surface.b}`);
    root.style.setProperty("--chrome-highlight-rgb", `${highlight.r} ${highlight.g} ${highlight.b}`);
    root.style.setProperty("--chrome-glow-rgb", `${glow.r} ${glow.g} ${glow.b}`);
  }

  update(time: number, delta: number) {
    if (!this.hasInitialLayout) return;

    const t = time / 1000;
    const dt = Math.min(delta / 1000, 1 / 30);
    const idleStrength = ULTRA_MODE.enabled ? ULTRA_MODE.idleStrength : 0;
    this.energyCharge = Math.max(0, this.energyCharge - dt * ENERGY_CHARGE_DECAY_PER_SEC);

    this.centerX = damp(this.centerX, this.centerXTarget, ULTRA_MODE.resizeLambda, dt);
    this.centerY = damp(this.centerY, this.centerYTarget, ULTRA_MODE.resizeLambda, dt);
    this.backgroundScale = damp(this.backgroundScale, this.backgroundScaleTarget, ULTRA_MODE.resizeLambda, dt);
    this.baseCreatureY = damp(this.baseCreatureY, this.baseCreatureYTarget, ULTRA_MODE.resizeLambda, dt);
    this.basePlatformY = damp(this.basePlatformY, this.basePlatformYTarget, ULTRA_MODE.resizeLambda, dt);
    this.creatureScaleX = damp(this.creatureScaleX, this.creatureScaleXTarget, ULTRA_MODE.scaleLambda, dt);
    this.creatureScaleY = damp(this.creatureScaleY, this.creatureScaleYTarget, ULTRA_MODE.scaleLambda, dt);
    this.platformScaleX = damp(this.platformScaleX, this.platformScaleXTarget, ULTRA_MODE.scaleLambda, dt);
    this.platformScaleY = damp(this.platformScaleY, this.platformScaleYTarget, ULTRA_MODE.scaleLambda, dt);
    this.shadowWidth = damp(this.shadowWidth, this.shadowWidthTarget, ULTRA_MODE.scaleLambda, dt);
    this.shadowHeight = damp(this.shadowHeight, this.shadowHeightTarget, ULTRA_MODE.scaleLambda, dt);

    const sleepSettle = this.sleepPoseProxy.settle;
    const sleepBreathe = this.sleepPoseProxy.breathe;
    const sleepNod = (this.sleepPoseProxy.nod - 0.5) * 2;
    const sleepDriftX = (this.sleepPoseProxy.driftX - 0.5) * 2.2;
    const sleepDriftY = (this.sleepPoseProxy.driftY - 0.5) * 1.8;
    const sleepPlatformDip = (this.sleepPoseProxy.platformDip - 0.5) * 1.3;
    const sleepShadowPulse = (this.sleepPoseProxy.shadowPulse - 0.5) * 2;
    const awakeMotionFactor = 1 - sleepSettle * 0.84;

    // Layered micro-idle motion keeps the creature alive even when no explicit action is active.
    const bob = Math.sin(t * this.bobOmega) * this.bobAmplitudeY * awakeMotionFactor;
    const idleFloat = Math.sin(t * 1.4) * 4 * idleStrength * awakeMotionFactor;
    const idleTilt = Math.sin(t * 0.8 + 0.45) * 0.4 * idleStrength * awakeMotionFactor;
    const idleBreathe = 1 + Math.sin(t * 2.2 + 0.9) * 0.02 * idleStrength * awakeMotionFactor;
    const idleDriftX = (Math.sin(t * 0.53) + Math.sin(t * 1.17 + 0.6) * 0.62) * 1.55 * idleStrength * awakeMotionFactor;
    const sleepBreatheX = 1 + sleepSettle * sleepBreathe * ULTRA_MODE.sleepBreatheStretchX;
    const sleepBreatheY = 1 - sleepSettle * sleepBreathe * ULTRA_MODE.sleepBreatheStretchY;

    this.yawnPoseValue = this.yawnPoseProxy.value;
    this.yawnReturnBias = damp(this.yawnReturnBias, 0, ULTRA_MODE.angleReturnLambda, dt);

    const yawnShift = -this.yawnPoseValue * ULTRA_MODE.yawnShiftPx;
    const yawnStretchX = 1 + this.yawnPoseValue * ULTRA_MODE.yawnStretchX;
    const yawnStretchY = 1 - this.yawnPoseValue * ULTRA_MODE.yawnStretchY;
    const yawnAngle = this.yawnPoseValue * ULTRA_MODE.yawnAngleDeg;
    const lookOffsetX = this.lookPoseProxy.x;
    const lookOffsetY = this.lookPoseProxy.y;
    const lookAngle = this.lookPoseProxy.angle;
    const jumpHeight = this.jumpPoseProxy.height;
    const jumpStretchX = 1 + this.jumpPoseProxy.stretchX;
    const jumpStretchY = 1 + this.jumpPoseProxy.stretchY;
    const jumpAngle = this.jumpPoseProxy.angle;
    const jumpDriftX = this.jumpPoseProxy.driftX;
    const jumpPlatformDip = this.jumpPoseProxy.platformDip;
    const cameraDriftX = (Math.sin(t * 0.21) + Math.sin(t * 0.44 + 0.7) * 0.55) * ULTRA_MODE.cameraDriftPx;
    const cameraDriftY = (Math.sin(t * 0.27 + 0.3) + Math.sin(t * 0.51 + 1.4) * 0.5) * (ULTRA_MODE.cameraDriftPx * 0.62);

    if (this.blinkNeedsRestore) {
      this.blinkRestoreMinRemainingMs = Math.max(0, this.blinkRestoreMinRemainingMs - dt * 1000);
      this.blinkSquashY = damp(this.blinkSquashY, 1, ULTRA_MODE.blinkRestoreLambda, dt);
      if (this.blinkRestoreMinRemainingMs <= 0 && Math.abs(1 - this.blinkSquashY) <= 0.0006) {
        this.blinkSquashY = 1;
        this.blinkNeedsRestore = false;
        const onComplete = this.blinkRestoreOnComplete;
        this.blinkRestoreOnComplete = null;
        onComplete?.();
      }
    }

    const creatureTargetX =
      this.centerX + idleDriftX + yawnShift + lookOffsetX + jumpDriftX + sleepDriftX * sleepSettle;
    const creatureTargetY =
      this.baseCreatureY +
      bob * 0.88 +
      idleFloat +
      this.yawnPoseValue * 1.15 +
      lookOffsetY -
      jumpHeight -
      sleepBreathe * sleepSettle * ULTRA_MODE.sleepBreatheLiftPx +
      sleepDriftY * sleepSettle;
    const platformTargetX = this.centerX + idleDriftX * 0.24;
    const platformTargetY =
      this.basePlatformY + bob * 0.95 + idleFloat * 0.16 + jumpPlatformDip + sleepPlatformDip * sleepSettle;

    this.creatureX = damp(this.creatureX, creatureTargetX, ULTRA_MODE.creatureFollowLambda, dt);
    this.creatureY = damp(this.creatureY, creatureTargetY, ULTRA_MODE.creatureFollowLambda, dt);
    this.platformX = damp(this.platformX, platformTargetX, ULTRA_MODE.platformFollowLambda, dt);
    this.platformY = damp(this.platformY, platformTargetY, ULTRA_MODE.platformFollowLambda, dt);

    const angleTarget =
      idleTilt + yawnAngle + this.yawnReturnBias + lookAngle + jumpAngle + sleepNod * sleepSettle * ULTRA_MODE.sleepNodAngleDeg;
    this.creatureAngle = damp(this.creatureAngle, angleTarget, ULTRA_MODE.angleLambda, dt);
    this.cameraScrollXTarget = cameraDriftX + lookOffsetX * ULTRA_MODE.cameraLookParallax;
    this.cameraScrollYTarget =
      cameraDriftY +
      lookOffsetY * ULTRA_MODE.cameraLookParallax -
      this.yawnPoseValue * ULTRA_MODE.cameraYawnParallax -
      sleepBreathe * sleepSettle * 0.95;
    this.cameraZoomTarget =
      1 +
      Math.sin(t * 0.33 + 0.2) * ULTRA_MODE.cameraZoomIdleAmp +
      this.yawnPoseValue * ULTRA_MODE.cameraZoomYawnAmp +
      jumpHeight * 0.00011 +
      (idleBreathe - 1) * 0.35 -
      sleepBreathe * sleepSettle * ULTRA_MODE.sleepCameraZoomAmp;
    this.cameraScrollX = damp(this.cameraScrollX, this.cameraScrollXTarget, ULTRA_MODE.cameraLambda, dt);
    this.cameraScrollY = damp(this.cameraScrollY, this.cameraScrollYTarget, ULTRA_MODE.cameraLambda, dt);
    this.cameraZoom = damp(this.cameraZoom, this.cameraZoomTarget, ULTRA_MODE.cameraLambda, dt);

    const creatureScaleX = this.creatureScaleX * idleBreathe * yawnStretchX * jumpStretchX * sleepBreatheX;
    const creatureScaleY =
      this.creatureScaleY * idleBreathe * yawnStretchY * jumpStretchY * this.blinkSquashY * sleepBreatheY;

    this.updateCrossfade(dt);

    this.background.setPosition(this.centerX, this.centerY);
    this.background.setScale(this.backgroundScale);

    this.platform.setScale(this.platformScaleX, this.platformScaleY);
    this.platform.setPosition(this.platformX, this.platformY);

    const velocityX = (this.creatureX - this.previousCreatureX) / Math.max(dt, 0.0001);
    const velocityY = (this.creatureY - this.previousCreatureY) / Math.max(dt, 0.0001);
    const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
    const trailTargetX = this.creatureX - velocityX * 0.011;
    const trailTargetY = this.creatureY - velocityY * 0.011;
    this.trailX = damp(this.trailX, trailTargetX, ULTRA_MODE.trailFollowLambda, dt);
    this.trailY = damp(this.trailY, trailTargetY, ULTRA_MODE.trailFollowLambda, dt);
    const trailAlpha = Phaser.Math.Clamp(
      ULTRA_MODE.trailBaseAlpha + speed * ULTRA_MODE.trailVelocityFactor,
      ULTRA_MODE.trailBaseAlpha,
      ULTRA_MODE.trailMaxAlpha
    ) * (1 - sleepSettle * 0.62);

    this.creatureTrail.setPosition(this.trailX, this.trailY);
    this.creatureTrail.setScale(creatureScaleX * 1.003, creatureScaleY * 1.003);
    this.creatureTrail.setAngle(this.creatureAngle);
    this.creatureTrail.setAlpha(trailAlpha);

    this.creature.setPosition(this.creatureX, this.creatureY);
    this.creature.setScale(creatureScaleX, creatureScaleY);
    this.creature.setAngle(this.creatureAngle);

    this.creatureBlend.setPosition(this.creatureX, this.creatureY);
    this.creatureBlend.setScale(creatureScaleX, creatureScaleY);
    this.creatureBlend.setAngle(this.creatureAngle);

    if (this.energyEmitter) {
      const energyAnchorY = this.creatureY + this.creature.displayHeight * 0.26;
      const energyCharge = Phaser.Math.Clamp(this.energyCharge, 0, 1);
      const energyPulse = 0.5 + Math.sin(t * 2.2 + 0.8) * 0.5;
      const actionBoost = this.isYawning ? 0.24 : this.isLooking ? 0.12 : this.isFluttering ? 0.08 : 0;
      const shouldEmit = !this.isSleeping && energyCharge >= ENERGY_MIN_ACTIVE_CHARGE;
      if (shouldEmit !== this.energyIsActive) {
        this.energyIsActive = shouldEmit;
        if (shouldEmit) this.energyEmitter.start();
        else this.energyEmitter.stop();
      }

      const targetFrequency = Phaser.Math.Clamp(
        Math.round(52 - energyCharge * 34 - energyPulse * 6 - actionBoost * 10),
        12,
        56,
      );
      const targetQuantity = energyCharge > 0.75 ? 7 : energyCharge > 0.45 ? 6 : energyCharge > 0.2 ? 5 : 4;
      this.energyEmitter.setPosition(this.creatureX, energyAnchorY);
      if (this.energyIsActive) {
        this.energyEmitter.setFrequency(targetFrequency, targetQuantity);
      }
    }

    const altitude = this.baseCreatureY - this.creatureY;
    const shadowScale = Phaser.Math.Clamp(
      1 - altitude * 0.0032 + sleepSettle * sleepShadowPulse * 0.03,
      0.72,
      1.08
    );
    const shadowAlpha = Phaser.Math.Clamp(
      0.3 - altitude * 0.0046 + sleepSettle * sleepShadowPulse * 0.02,
      0.11,
      0.34
    );
    const shadowY = this.platformY + this.platform.displayHeight * 0.13;

    this.shadowSoft.setPosition(this.platformX, shadowY + 1.5);
    this.shadowSoft.setScale(this.shadowWidth * 1.2 * shadowScale, this.shadowHeight * 1.28 * shadowScale);
    this.shadowSoft.setAlpha(shadowAlpha * 0.45);

    this.shadow.setPosition(this.platformX, shadowY);
    this.shadow.setScale(this.shadowWidth * shadowScale, this.shadowHeight * shadowScale);
    this.shadow.setAlpha(shadowAlpha);

    if (this.sleepSnoreEmitter) {
      const shouldSnore = this.isSleeping && sleepSettle > 0.45;
      if (shouldSnore) {
        const snoreAnchorX = this.creatureX + this.creature.displayWidth * 0.09;
        const snoreAnchorY = this.creatureY - this.creature.displayHeight * 0.06;
        this.sleepSnoreEmitter.setPosition(snoreAnchorX, snoreAnchorY);
        this.sleepSnoreEmitter.setFrequency(Math.round(700 - sleepBreathe * 280), 1);
        if (!this.sleepSnoreEmitter.emitting) this.sleepSnoreEmitter.start();
      } else if (this.sleepSnoreEmitter.emitting) {
        this.sleepSnoreEmitter.stop();
      }
    }

    this.cameras.main.setScroll(this.cameraScrollX, this.cameraScrollY);
    this.cameras.main.setZoom(this.cameraZoom);

    this.previousCreatureX = this.creatureX;
    this.previousCreatureY = this.creatureY;
  }

  private layout(gameSize: { width: number; height: number }) {
    const width = gameSize.width;
    const height = gameSize.height;
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const backgroundScale = Math.max(width / this.background.width, height / this.background.height);

    const creatureWidth = Phaser.Math.Clamp(width * 0.54, 180, 330);
    const creatureHeight = (creatureWidth / CREATURE_TEXTURE_WIDTH) * CREATURE_TEXTURE_HEIGHT;
    const platformWidth = Phaser.Math.Clamp(creatureWidth * 1.25, 220, 430);
    const platformHeight = (platformWidth / PLATFORM_TEXTURE_WIDTH) * PLATFORM_TEXTURE_HEIGHT;

    const baseCreatureY = centerY;
    const basePlatformY =
      baseCreatureY +
      creatureHeight * CREATURE_CONTACT_RATIO +
      platformHeight * PLATFORM_SURFACE_RATIO +
      creatureHeight * PLATFORM_GAP_RATIO;

    this.centerXTarget = centerX;
    this.centerYTarget = centerY;
    this.backgroundScaleTarget = backgroundScale;

    this.baseCreatureYTarget = baseCreatureY;
    this.basePlatformYTarget = basePlatformY;

    this.creatureScaleXTarget = creatureWidth / CREATURE_TEXTURE_WIDTH;
    this.creatureScaleYTarget = creatureHeight / CREATURE_TEXTURE_HEIGHT;
    this.platformScaleXTarget = platformWidth / PLATFORM_TEXTURE_WIDTH;
    this.platformScaleYTarget = platformHeight / PLATFORM_TEXTURE_HEIGHT;

    this.shadowWidthTarget = creatureWidth * 0.4;
    this.shadowHeightTarget = creatureHeight * 0.065;

    if (this.hasInitialLayout) return;

    this.centerX = this.centerXTarget;
    this.centerY = this.centerYTarget;
    this.backgroundScale = this.backgroundScaleTarget;
    this.baseCreatureY = this.baseCreatureYTarget;
    this.basePlatformY = this.basePlatformYTarget;
    this.creatureScaleX = this.creatureScaleXTarget;
    this.creatureScaleY = this.creatureScaleYTarget;
    this.platformScaleX = this.platformScaleXTarget;
    this.platformScaleY = this.platformScaleYTarget;
    this.shadowWidth = this.shadowWidthTarget;
    this.shadowHeight = this.shadowHeightTarget;
    this.creatureX = this.centerX;
    this.creatureY = this.baseCreatureY;
    this.platformX = this.centerX;
    this.platformY = this.basePlatformY;
    this.trailX = this.creatureX;
    this.trailY = this.creatureY;
    this.previousCreatureX = this.creatureX;
    this.previousCreatureY = this.creatureY;

    this.background.setPosition(this.centerX, this.centerY);
    this.background.setScale(this.backgroundScale);
    this.platform.setScale(this.platformScaleX, this.platformScaleY);
    this.platform.setPosition(this.platformX, this.platformY);
    this.creatureTrail.setPosition(this.creatureX, this.creatureY);
    this.creatureTrail.setScale(this.creatureScaleX, this.creatureScaleY);
    this.creature.setPosition(this.creatureX, this.creatureY);
    this.creature.setScale(this.creatureScaleX, this.creatureScaleY);
    this.creatureBlend.setPosition(this.creatureX, this.creatureY);
    this.creatureBlend.setScale(this.creatureScaleX, this.creatureScaleY);
    this.energyEmitter?.setPosition(this.creatureX, this.creatureY + creatureHeight * 0.26);
    this.sleepSnoreEmitter?.setPosition(this.creatureX + creatureWidth * 0.09, this.creatureY - creatureHeight * 0.06);

    this.shadowSoft.setPosition(this.platformX, this.platformY);
    this.shadowSoft.setScale(this.shadowWidth * 1.2, this.shadowHeight * 1.28);
    this.shadow.setPosition(this.platformX, this.platformY);
    this.shadow.setScale(this.shadowWidth, this.shadowHeight);
    this.cameraScrollX = 0;
    this.cameraScrollY = 0;
    this.cameraScrollXTarget = 0;
    this.cameraScrollYTarget = 0;
    this.cameraZoom = 1;
    this.cameraZoomTarget = 1;
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setZoom(1);

    this.hasInitialLayout = true;
  }

  private resolveCreatureTextureKey() {
    if (this.isJumping && this.textures.exists(CREATURE_ACTION_JUMP_00_KEY)) return CREATURE_ACTION_JUMP_00_KEY;
    if (this.isYawning) {
      const yawnKey = CREATURE_YAWN_KEYS[this.yawnFrameIndex];
      if (yawnKey && this.textures.exists(yawnKey)) return yawnKey;
    }
    if (this.isSleeping && this.textures.exists(CREATURE_IDLE_SLEEPING_KEY)) return CREATURE_IDLE_SLEEPING_KEY;
    if (this.isEyesClosed && this.textures.exists(CREATURE_EYES_CLOSED_KEY)) return CREATURE_EYES_CLOSED_KEY;
    if (this.lookFrameKey && this.textures.exists(this.lookFrameKey)) return this.lookFrameKey;
    if (this.isFluttering) {
      const flutterKey = CREATURE_FLUTTER_KEYS[this.flutterFrameIndex];
      if (flutterKey && this.textures.exists(flutterKey)) return flutterKey;
    }
    if (!this.isEyesClosed && this.textures.exists(CREATURE_EYES_OPEN_KEY)) return CREATURE_EYES_OPEN_KEY;
    return CREATURE_BASE_KEY;
  }

  private isEyeStateKey(key: string) {
    return key === CREATURE_EYES_OPEN_KEY || key === CREATURE_EYES_CLOSED_KEY;
  }

  private isLookStateKey(key: string) {
    return (
      key === CREATURE_LOOKS_RIGHT_KEY ||
      key === CREATURE_LOOKS_UP_LEFT_KEY ||
      key === CREATURE_IDLE_LOOKS_DOWN_KEY ||
      key === CREATURE_IDLE_ANNOYED_KEY
    );
  }

  private isFlutterStateKey(key: string) {
    return CREATURE_FLUTTER_KEYS.includes(key);
  }

  private isYawnStateKey(key: string) {
    return CREATURE_YAWN_KEYS.includes(key);
  }

  private isJumpStateKey(key: string) {
    return key === CREATURE_ACTION_JUMP_00_KEY;
  }

  private isSleepStateKey(key: string) {
    return key === CREATURE_IDLE_SLEEPING_KEY;
  }

  private resolveCreatureFlipX() {
    return this.lookFrameKey ? this.lookFlipX : false;
  }

  private setCreatureFlipX(flipX: boolean, applyToBlend = true) {
    this.creature.setFlipX(flipX);
    this.creatureTrail.setFlipX(flipX);
    if (applyToBlend) this.creatureBlend.setFlipX(flipX);
  }

  private setCreatureTextureImmediate(nextKey: string, nextFlipX: boolean) {
    if (this.creature.texture.key !== nextKey) this.creature.setTexture(nextKey);
    if (this.creatureTrail.texture.key !== nextKey) this.creatureTrail.setTexture(nextKey);
    this.setCreatureFlipX(nextFlipX);
    this.currentCreatureKey = nextKey;
    this.currentCreatureFlipX = nextFlipX;
    this.isCrossfading = false;
    this.crossfadeElapsed = 0;
    this.creature.setAlpha(1);
    this.creatureBlend.setVisible(false).setAlpha(0);
  }

  private crossfadeCreatureTexture(nextKey: string, nextFlipX: boolean, durationMs: number) {
    if (this.currentCreatureKey === nextKey && this.currentCreatureFlipX === nextFlipX) return;
    this.crossfadeDuration = Phaser.Math.Clamp(durationMs / 1000, 0.04, 0.095);
    this.crossfadeElapsed = 0;
    this.isCrossfading = true;

    this.creatureBlend.setTexture(this.currentCreatureKey);
    this.creatureBlend.setFlipX(this.currentCreatureFlipX);
    this.creatureBlend.setAlpha(1);
    this.creatureBlend.setVisible(true);

    this.creature.setTexture(nextKey);
    this.creature.setAlpha(0);
    this.setCreatureFlipX(nextFlipX, false);
    if (this.creatureTrail.texture.key !== nextKey) this.creatureTrail.setTexture(nextKey);
    this.creatureTrail.setFlipX(nextFlipX);
    this.currentCreatureKey = nextKey;
    this.currentCreatureFlipX = nextFlipX;
  }

  private updateCrossfade(dt: number) {
    if (!this.isCrossfading) return;
    this.crossfadeElapsed += dt;
    const progress = Phaser.Math.Clamp(this.crossfadeElapsed / this.crossfadeDuration, 0, 1);
    this.creature.setAlpha(progress);
    this.creatureBlend.setAlpha(1 - progress);
    if (progress >= 1) {
      this.isCrossfading = false;
      this.creature.setAlpha(1);
      this.creatureBlend.setVisible(false).setAlpha(0);
    }
  }

  private applyCreatureVisualState() {
    const nextKey = this.resolveCreatureTextureKey();
    const nextFlipX = this.resolveCreatureFlipX();
    if (nextKey === this.currentCreatureKey && nextFlipX === this.currentCreatureFlipX) return;

    const isEyeTransition = this.isEyeStateKey(this.currentCreatureKey) && this.isEyeStateKey(nextKey);
    const isLookTransition = this.isLookStateKey(this.currentCreatureKey) || this.isLookStateKey(nextKey);
    const isFlutterTransition = this.isFlutterStateKey(this.currentCreatureKey) || this.isFlutterStateKey(nextKey);
    const isYawnTransition = this.isYawnStateKey(this.currentCreatureKey) || this.isYawnStateKey(nextKey);
    const isJumpTransition = this.isJumpStateKey(this.currentCreatureKey) || this.isJumpStateKey(nextKey);
    const isSleepTransition = this.isSleepStateKey(this.currentCreatureKey) || this.isSleepStateKey(nextKey);
    const shouldCrossfadeEyes = this.isEyeStateKey(this.currentCreatureKey) && this.isEyeStateKey(nextKey);

    if (
      isEyeTransition ||
      isLookTransition ||
      isFlutterTransition ||
      isYawnTransition ||
      isJumpTransition ||
      isSleepTransition ||
      shouldCrossfadeEyes
    ) {
      const durationMs = isYawnTransition
        ? ULTRA_MODE.yawnCrossfadeMs
        : isJumpTransition
          ? ULTRA_MODE.jumpCrossfadeMs
        : isSleepTransition
          ? ULTRA_MODE.sleepCrossfadeMs
        : isLookTransition
          ? ULTRA_MODE.lookCrossfadeMs
          : isFlutterTransition
            ? ULTRA_MODE.flutterCrossfadeMs
          : ULTRA_MODE.eyeCrossfadeMs;
      this.crossfadeCreatureTexture(nextKey, nextFlipX, durationMs);
      return;
    }

    this.setCreatureTextureImmediate(nextKey, nextFlipX);
  }

  private setEyesClosed(closed: boolean) {
    this.isEyesClosed = closed;
    this.applyCreatureVisualState();
  }

  private resolveLookPoseTargets(pose: LookPose) {
    if (pose === "left") return { x: -2.4, y: -0.45, angle: -0.34 };
    if (pose === "right") return { x: 2.4, y: -0.45, angle: 0.34 };
    if (pose === "up-left") return { x: -3.1, y: -2.55, angle: -0.6 };
    if (pose === "up-right") return { x: 3.1, y: -2.55, angle: 0.6 };
    if (pose === "down-left") return { x: -2.1, y: 1.8, angle: -0.48 };
    if (pose === "down-right") return { x: 2.1, y: 1.8, angle: 0.48 };
    if (pose === "annoyed-left") return { x: -3.8, y: -1.1, angle: -1.22 };
    if (pose === "annoyed-right") return { x: 3.8, y: -1.1, angle: 1.22 };
    return { x: 0, y: 0, angle: 0 };
  }

  private applyLookStep(step: LookStep) {
    this.lookFrameKey = step.frameKey;
    this.lookFlipX = step.flipX;
    this.applyCreatureVisualState();

    const poseTarget = this.resolveLookPoseTargets(step.pose);
    const ease =
      step.pose === "up-left" || step.pose === "up-right"
        ? "Back.easeOut"
        : step.pose === "down-left" || step.pose === "down-right"
          ? "Sine.easeInOut"
          : step.pose === "annoyed-left" || step.pose === "annoyed-right"
            ? "Cubic.easeInOut"
        : step.pose === "center"
          ? "Cubic.easeOut"
          : "Cubic.easeInOut";
    this.lookTween?.stop();
    this.lookTween = this.tweens.add({
      targets: this.lookPoseProxy,
      x: poseTarget.x,
      y: poseTarget.y,
      angle: poseTarget.angle,
      duration: step.tweenMs,
      ease,
    });
  }

  private stopLookLoop() {
    this.lookTimer?.remove(false);
    this.lookTimer = null;
    this.lookStepTimer?.remove(false);
    this.lookStepTimer = null;
    this.lookTween?.stop();
    this.lookTween = null;

    this.isLooking = false;
    this.lookFrameKey = null;
    this.lookFlipX = false;
    this.lookPoseProxy.x = 0;
    this.lookPoseProxy.y = 0;
    this.lookPoseProxy.angle = 0;

    if (this.creature) {
      this.applyCreatureVisualState();
    }
  }

  private scheduleNextLook(delayMs?: number) {
    this.lookTimer?.remove(false);
    const nextDelay = delayMs ?? Phaser.Math.Between(LOOK_INTERVAL_MIN_MS, LOOK_INTERVAL_MAX_MS);
    this.lookTimer = this.time.delayedCall(nextDelay, () => {
      this.playLookSequence();
    });
  }

  private finishLookSequence() {
    this.lookStepTimer?.remove(false);
    this.lookStepTimer = null;
    this.isLooking = false;
    this.lookFrameKey = null;
    this.lookFlipX = false;
    this.applyCreatureVisualState();
    this.scheduleNextBlink(Phaser.Math.Between(BLINK_AFTER_ACTION_MIN_MS, BLINK_AFTER_ACTION_MAX_MS));
    this.scheduleNextLook();
  }

  private beginSwipeTracking(pointer: Phaser.Input.Pointer) {
    this.swipePointerId = pointer.id;
    this.swipeLastX = pointer.worldX;
    this.swipeLastDirection = 0;
    this.swipeAlternations = 0;
  }

  private endSwipeTracking(pointerId?: number) {
    if (pointerId !== undefined && this.swipePointerId !== pointerId) return;
    this.swipePointerId = null;
    this.swipeLastDirection = 0;
    this.swipeAlternations = 0;
  }

  private resolveEnergyParticleTextureKey() {
    if (this.textures.exists(ENERGY_PARTICLE_KEY)) return ENERGY_PARTICLE_KEY;
    if (this.textures.exists(ENERGY_PARTICLE_FALLBACK_KEY)) return ENERGY_PARTICLE_FALLBACK_KEY;

    const graphics = this.add.graphics();
    graphics.fillStyle(0x59d8ff, 0.96);
    graphics.fillCircle(20, 20, 20);
    graphics.fillStyle(0xd5f9ff, 0.92);
    graphics.fillCircle(20, 20, 12);
    graphics.generateTexture(ENERGY_PARTICLE_FALLBACK_KEY, 40, 40);
    graphics.destroy();

    return ENERGY_PARTICLE_FALLBACK_KEY;
  }

  private resolveSnoreParticleTextureKey() {
    if (this.textures.exists(SNORE_PARTICLE_FALLBACK_KEY)) return SNORE_PARTICLE_FALLBACK_KEY;

    const graphics = this.add.graphics();
    graphics.fillStyle(0xd9ecff, 0.92);
    graphics.fillCircle(14, 14, 14);
    graphics.fillStyle(0xf4f9ff, 0.9);
    graphics.fillCircle(14, 14, 8);
    graphics.generateTexture(SNORE_PARTICLE_FALLBACK_KEY, 28, 28);
    graphics.destroy();

    return SNORE_PARTICLE_FALLBACK_KEY;
  }

  private runLookSteps(steps: LookStep[]) {
    this.lookStepTimer?.remove(false);
    this.lookStepTimer = null;
    this.lookTween?.stop();
    this.lookTween = null;
    this.isLooking = true;

    let stepIndex = 0;
    const runStep = () => {
      if (!this.isLooking) return;
      const step = steps[stepIndex];
      if (!step) {
        this.finishLookSequence();
        return;
      }

      this.applyLookStep(step);
      stepIndex += 1;
      const waitMs = step.tweenMs + (step.holdMs ?? 0);
      this.lookStepTimer = this.time.delayedCall(waitMs, runStep);
    };

    runStep();
  }

  private playTapLookDownSequence(sideIsLeft: boolean) {
    if (this.isYawning || this.isBlinking || this.isFluttering || this.isJumping || this.isSleeping) return;
    this.lookTimer?.remove(false);
    this.lookTimer = null;

    const tweenMs = Phaser.Math.Between(LOOK_UP_TWEEN_MIN_MS, LOOK_UP_TWEEN_MAX_MS);
    const holdMs = Phaser.Math.Between(LOOK_HOLD_MIN_MS, LOOK_HOLD_MAX_MS);
    const returnTweenMs = Phaser.Math.Between(LOOK_RETURN_TWEEN_MIN_MS, LOOK_RETURN_TWEEN_MAX_MS);
    const lookDownEnterPose: LookPose = sideIsLeft ? "down-left" : "down-right";

    const steps: LookStep[] = [
      {
        frameKey: CREATURE_IDLE_LOOKS_DOWN_KEY,
        flipX: sideIsLeft,
        pose: lookDownEnterPose,
        tweenMs,
        holdMs,
      },
      {
        frameKey: null,
        flipX: false,
        pose: "center",
        tweenMs: returnTweenMs,
      },
    ];

    this.runLookSteps(steps);
  }

  private playLookSequence() {
    if (this.isLooking || this.isYawning || this.isBlinking || this.isFluttering || this.isJumping || this.isSleeping) {
      this.scheduleNextLook(Phaser.Math.Between(700, 1400));
      return;
    }

    const sideIsLeft = Math.random() < 0.5;
    const sideTweenMs = Phaser.Math.Between(LOOK_SIDE_TWEEN_MIN_MS, LOOK_SIDE_TWEEN_MAX_MS);
    const upTweenMs = Phaser.Math.Between(LOOK_UP_TWEEN_MIN_MS, LOOK_UP_TWEEN_MAX_MS);
    const holdMs = Phaser.Math.Between(LOOK_HOLD_MIN_MS, LOOK_HOLD_MAX_MS);
    const returnTweenMs = Phaser.Math.Between(LOOK_RETURN_TWEEN_MIN_MS, LOOK_RETURN_TWEEN_MAX_MS);
    const mirrorTweenMs = Phaser.Math.Between(LOOK_MIRROR_TWEEN_MIN_MS, LOOK_MIRROR_TWEEN_MAX_MS);
    const lookDownRoll = Math.random();
    const useLookDown = lookDownRoll < LOOK_DOWN_CHANCE;
    const useAnnoyed = !useLookDown && lookDownRoll < LOOK_DOWN_CHANCE + LOOK_ANNOYED_CHANCE;

    const lookSideStep: LookStep = sideIsLeft
      ? {
          frameKey: CREATURE_LOOKS_RIGHT_KEY,
          flipX: true,
          pose: "left",
          tweenMs: sideTweenMs,
        }
      : {
          frameKey: CREATURE_LOOKS_RIGHT_KEY,
          flipX: false,
          pose: "right",
          tweenMs: sideTweenMs,
        };

    const lookUpStep: LookStep = sideIsLeft
      ? {
          frameKey: CREATURE_LOOKS_UP_LEFT_KEY,
          flipX: false,
          pose: "up-left",
          tweenMs: upTweenMs,
          holdMs,
        }
      : {
          frameKey: CREATURE_LOOKS_UP_LEFT_KEY,
          flipX: true,
          pose: "up-right",
          tweenMs: upTweenMs,
          holdMs,
        };

    const returnStep: LookStep = {
      frameKey: null,
      flipX: false,
      pose: "center",
      tweenMs: returnTweenMs,
    };

    const lookDownEnterPose: LookPose = sideIsLeft ? "down-left" : "down-right";
    const annoyedEnterPose: LookPose = sideIsLeft ? "annoyed-left" : "annoyed-right";
    const annoyedMirrorPose: LookPose = sideIsLeft ? "annoyed-right" : "annoyed-left";

    const lookDownSteps: LookStep[] = [
      {
        frameKey: CREATURE_IDLE_LOOKS_DOWN_KEY,
        flipX: sideIsLeft,
        pose: lookDownEnterPose,
        tweenMs: upTweenMs,
        holdMs: holdMs,
      },
      returnStep,
    ];

    const annoyedSteps: LookStep[] = [
      {
        frameKey: CREATURE_IDLE_ANNOYED_KEY,
        flipX: sideIsLeft,
        pose: annoyedEnterPose,
        tweenMs: sideTweenMs,
        holdMs: Math.floor(holdMs * 0.38),
      },
      {
        frameKey: CREATURE_IDLE_ANNOYED_KEY,
        flipX: !sideIsLeft,
        pose: annoyedMirrorPose,
        tweenMs: mirrorTweenMs,
        holdMs: Math.floor(holdMs * 0.74),
      },
      returnStep,
    ];

    const steps = useLookDown ? lookDownSteps : useAnnoyed ? annoyedSteps : [lookSideStep, lookUpStep, returnStep];
    this.runLookSteps(steps);
  }

  private resetSleepPose() {
    this.sleepPoseProxy.settle = 0;
    this.sleepPoseProxy.breathe = 0;
    this.sleepPoseProxy.nod = 0;
    this.sleepPoseProxy.driftX = 0;
    this.sleepPoseProxy.driftY = 0;
    this.sleepPoseProxy.platformDip = 0;
    this.sleepPoseProxy.shadowPulse = 0;
  }

  private stopSleepLoop() {
    this.sleepTimer?.remove(false);
    this.sleepTimer = null;
    this.sleepSettleTween?.stop();
    this.sleepSettleTween = null;
    this.sleepBreatheTween?.stop();
    this.sleepBreatheTween = null;
    this.sleepNodTween?.stop();
    this.sleepNodTween = null;
    this.sleepDriftTween?.stop();
    this.sleepDriftTween = null;
    if (this.sleepSnoreEmitter?.emitting) this.sleepSnoreEmitter.stop();
    this.isSleeping = false;
    this.resetSleepPose();
    if (this.creature) {
      this.applyCreatureVisualState();
    }
  }

  private scheduleNextSleep(delayMs?: number) {
    this.sleepTimer?.remove(false);
    if (this.hasActiveTask) return;
    const nextDelay = Math.max(0, delayMs ?? WAKE_AFTER_TAP_MS);
    this.sleepTimer = this.time.delayedCall(nextDelay, () => {
      if (this.hasActiveTask) return;
      this.playSleepSequence();
    });
  }

  private playSleepSequence() {
    if (this.isSleeping) return;
    if (this.isLooking || this.isBlinking || this.isFluttering || this.isJumping || this.isYawning || this.isCrossfading) {
      this.scheduleNextSleep(Phaser.Math.Between(SLEEP_RETRY_MIN_MS, SLEEP_RETRY_MAX_MS));
      return;
    }

    this.isSleeping = true;
    this.isEyesClosed = false;
    this.applyCreatureVisualState();
    this.sleepSettleTween?.stop();
    this.sleepBreatheTween?.stop();
    this.sleepNodTween?.stop();
    this.sleepDriftTween?.stop();

    const settleMs = Phaser.Math.Between(SLEEP_SETTLE_MIN_MS, SLEEP_SETTLE_MAX_MS);
    this.sleepSettleTween = this.tweens.add({
      targets: this.sleepPoseProxy,
      settle: 1,
      duration: settleMs,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (!this.isSleeping) return;
        this.sleepSettleTween = null;

        const breatheMs = Phaser.Math.Between(SLEEP_BREATHE_MIN_MS, SLEEP_BREATHE_MAX_MS);
        const nodMs = Phaser.Math.Between(SLEEP_NOD_MIN_MS, SLEEP_NOD_MAX_MS);
        const driftMs = Phaser.Math.Between(SLEEP_DRIFT_MIN_MS, SLEEP_DRIFT_MAX_MS);

        this.sleepBreatheTween = this.tweens.add({
          targets: this.sleepPoseProxy,
          breathe: 1,
          duration: breatheMs,
          ease: "Sine.easeInOut",
          yoyo: true,
          repeat: -1,
        });
        this.sleepNodTween = this.tweens.add({
          targets: this.sleepPoseProxy,
          nod: 1,
          duration: nodMs,
          ease: "Sine.easeInOut",
          yoyo: true,
          repeat: -1,
        });
        this.sleepDriftTween = this.tweens.add({
          targets: this.sleepPoseProxy,
          driftX: 1,
          driftY: 1,
          platformDip: 1,
          shadowPulse: 1,
          duration: driftMs,
          ease: "Sine.easeInOut",
          yoyo: true,
          repeat: -1,
        });
      },
    });
  }

  private wakeFromSleep(fromUserInput: boolean) {
    if (!this.isSleeping) return;
    this.sleepBreatheTween?.stop();
    this.sleepBreatheTween = null;
    this.sleepNodTween?.stop();
    this.sleepNodTween = null;
    this.sleepDriftTween?.stop();
    this.sleepDriftTween = null;
    if (this.sleepSnoreEmitter?.emitting) this.sleepSnoreEmitter.stop();

    const wakeMs = fromUserInput ? SLEEP_WAKE_MIN_MS : Phaser.Math.Between(SLEEP_WAKE_MIN_MS, SLEEP_WAKE_MAX_MS);
    this.sleepSettleTween?.stop();
    this.sleepSettleTween = this.tweens.add({
      targets: this.sleepPoseProxy,
      settle: 0,
      breathe: 0,
      nod: 0,
      driftX: 0,
      driftY: 0,
      platformDip: 0,
      shadowPulse: 0,
      duration: wakeMs,
      ease: fromUserInput ? "Back.easeOut" : "Sine.easeInOut",
      onComplete: () => {
        this.sleepSettleTween = null;
        this.isSleeping = false;
        this.resetSleepPose();
        this.applyCreatureVisualState();
        if (this.hasActiveTask) {
          this.sleepTimer?.remove(false);
          this.sleepTimer = null;
          this.scheduleNextBlink(Phaser.Math.Between(BLINK_AFTER_ACTION_MIN_MS, BLINK_AFTER_ACTION_MAX_MS));
          return;
        }
        if (fromUserInput) {
          this.scheduleNextSleep(WAKE_AFTER_TAP_MS);
          this.energyCharge = Phaser.Math.Clamp(this.energyCharge + 0.18, 0, 1);
          this.scheduleNextBlink(Phaser.Math.Between(280, 560));
          this.scheduleNextLook(Phaser.Math.Between(420, 840));
          return;
        }
        this.scheduleNextSleep(WAKE_AFTER_TASK_COMPLETE_MS);
        this.scheduleNextBlink(Phaser.Math.Between(BLINK_AFTER_ACTION_MIN_MS, BLINK_AFTER_ACTION_MAX_MS));
      },
    });
  }

  public setTaskRunning(isRunning: boolean) {
    if (this.hasActiveTask === isRunning) return;
    this.hasActiveTask = isRunning;

    if (isRunning) {
      this.sleepTimer?.remove(false);
      this.sleepTimer = null;
      if (this.isSleeping) {
        this.wakeFromSleep(false);
      }
      return;
    }

    if (!this.isSleeping) {
      this.scheduleNextSleep(WAKE_AFTER_TASK_COMPLETE_MS);
    }
  }

  private resetJumpPose() {
    this.jumpPoseProxy.height = 0;
    this.jumpPoseProxy.stretchX = 0;
    this.jumpPoseProxy.stretchY = 0;
    this.jumpPoseProxy.angle = 0;
    this.jumpPoseProxy.driftX = 0;
    this.jumpPoseProxy.platformDip = 0;
  }

  private stopJumpLoop() {
    this.jumpTimer?.remove(false);
    this.jumpTimer = null;
    this.jumpTween?.stop();
    this.jumpTween = null;
    this.isJumping = false;
    this.resetJumpPose();
    if (this.creature) {
      this.applyCreatureVisualState();
    }
  }

  private scheduleNextJump(delayMs?: number) {
    this.jumpTimer?.remove(false);
    const nextDelay = delayMs ?? Phaser.Math.Between(JUMP_INTERVAL_MIN_MS, JUMP_INTERVAL_MAX_MS);
    this.jumpTimer = this.time.delayedCall(nextDelay, () => {
      this.playJumpSequence();
    });
  }

  private finishJumpSequence() {
    this.jumpTween?.stop();
    this.jumpTween = this.tweens.add({
      targets: this.jumpPoseProxy,
      height: 0,
      stretchX: 0,
      stretchY: 0,
      angle: 0,
      driftX: 0,
      platformDip: 0,
      duration: Phaser.Math.Between(JUMP_RECOVER_MIN_MS, JUMP_RECOVER_MAX_MS),
      ease: "Back.easeOut",
      onComplete: () => {
        this.jumpTween = null;
        this.isJumping = false;
        this.applyCreatureVisualState();
        this.scheduleNextBlink(Phaser.Math.Between(BLINK_AFTER_ACTION_MIN_MS, BLINK_AFTER_ACTION_MAX_MS));
        this.scheduleNextJump();
      },
    });
  }

  private playJumpSequence() {
    if (this.isJumping) return;
    if (this.isLooking || this.isBlinking || this.isFluttering || this.isYawning || this.isCrossfading || this.isSleeping) {
      this.scheduleNextJump(Phaser.Math.Between(JUMP_RETRY_MIN_MS, JUMP_RETRY_MAX_MS));
      return;
    }

    this.isJumping = true;
    this.applyCreatureVisualState();

    const jumpDirection = Math.random() < 0.5 ? -1 : 1;
    const jumpHeight = Phaser.Math.Between(52, 72);
    const jumpDrift = Phaser.Math.FloatBetween(4.2, 8.8) * jumpDirection;
    const jumpTilt = Phaser.Math.FloatBetween(2.2, 5.4) * jumpDirection;
    const crouchMs = Phaser.Math.Between(JUMP_CROUCH_MIN_MS, JUMP_CROUCH_MAX_MS);
    const launchMs = Phaser.Math.Between(JUMP_LAUNCH_MIN_MS, JUMP_LAUNCH_MAX_MS);
    const apexMs = Phaser.Math.Between(JUMP_APEX_HOLD_MIN_MS, JUMP_APEX_HOLD_MAX_MS);
    const descendMs = Phaser.Math.Between(JUMP_DESCEND_MIN_MS, JUMP_DESCEND_MAX_MS);
    const landMs = Phaser.Math.Between(JUMP_LAND_MIN_MS, JUMP_LAND_MAX_MS);

    this.jumpTween?.stop();
    this.jumpTween = this.tweens.chain({
      tweens: [
        {
          targets: this.jumpPoseProxy,
          height: -7.2,
          stretchX: 0.068,
          stretchY: -0.108,
          angle: -jumpTilt * 0.32,
          driftX: 0,
          platformDip: 3.6,
          duration: crouchMs,
          ease: "Quad.easeIn",
        },
        {
          targets: this.jumpPoseProxy,
          height: jumpHeight,
          stretchX: -0.054,
          stretchY: 0.09,
          angle: jumpTilt,
          driftX: jumpDrift,
          platformDip: 1.4,
          duration: launchMs,
          ease: "Cubic.easeOut",
        },
        {
          targets: this.jumpPoseProxy,
          height: jumpHeight * 1.03,
          stretchX: -0.018,
          stretchY: 0.03,
          angle: jumpTilt * 0.56,
          driftX: jumpDrift * 1.06,
          platformDip: 0,
          duration: apexMs,
          ease: "Sine.easeInOut",
        },
        {
          targets: this.jumpPoseProxy,
          height: 5.4,
          stretchX: 0.022,
          stretchY: -0.022,
          angle: -jumpTilt * 0.16,
          driftX: jumpDrift * 0.74,
          platformDip: 4.2,
          duration: descendMs,
          ease: "Quad.easeIn",
        },
        {
          targets: this.jumpPoseProxy,
          height: 0,
          stretchX: 0.084,
          stretchY: -0.13,
          angle: -jumpTilt * 0.48,
          driftX: 0,
          platformDip: 8.3,
          duration: landMs,
          ease: "Cubic.easeOut",
        },
      ],
      onComplete: () => {
        this.finishJumpSequence();
      },
    });
  }

  private stopFlutterLoop() {
    this.flutterTimer?.remove(false);
    this.flutterTimer = null;
    this.flutterStepTimer?.remove(false);
    this.flutterStepTimer = null;
    this.isFluttering = false;
    this.flutterFrameIndex = 0;
    if (this.creature) {
      this.applyCreatureVisualState();
    }
  }

  private scheduleNextFlutter(delayMs?: number) {
    this.flutterTimer?.remove(false);
    const nextDelay = delayMs ?? Phaser.Math.Between(FLUTTER_INTERVAL_MIN_MS, FLUTTER_INTERVAL_MAX_MS);
    this.flutterTimer = this.time.delayedCall(nextDelay, () => {
      this.playFlutterSequence();
    });
  }

  private finishFlutterSequence() {
    this.flutterStepTimer?.remove(false);
    this.flutterStepTimer = null;
    this.isFluttering = false;
    this.flutterFrameIndex = 0;
    this.applyCreatureVisualState();
    this.scheduleNextBlink(Phaser.Math.Between(BLINK_AFTER_ACTION_MIN_MS, BLINK_AFTER_ACTION_MAX_MS));
    this.scheduleNextFlutter();
  }

  private playFlutterSequence() {
    if (this.isFluttering) return;
    if (this.isYawning || this.isLooking || this.isBlinking || this.isJumping || this.isSleeping) {
      this.scheduleNextFlutter(Phaser.Math.Between(900, 1700));
      return;
    }

    this.isFluttering = true;
    const stepMs = Phaser.Math.Between(FLUTTER_STEP_MIN_MS, FLUTTER_STEP_MAX_MS);
    const peakHoldMs = Phaser.Math.Between(FLUTTER_PEAK_HOLD_MIN_MS, FLUTTER_PEAK_HOLD_MAX_MS);
    const steps: Array<{ frame: number; duration: number }> = [
      { frame: 0, duration: stepMs },
      { frame: 1, duration: stepMs },
      { frame: 2, duration: peakHoldMs },
      { frame: 1, duration: stepMs },
      { frame: 0, duration: stepMs },
    ];

    let stepIndex = 0;
    const runStep = () => {
      if (!this.isFluttering) return;
      const step = steps[stepIndex];
      if (!step) {
        this.finishFlutterSequence();
        return;
      }

      this.flutterFrameIndex = step.frame;
      this.applyCreatureVisualState();
      stepIndex += 1;
      this.flutterStepTimer = this.time.delayedCall(step.duration, runStep);
    };

    runStep();
  }

  private stopBlinkLoop() {
    this.blinkTimer?.remove(false);
    this.blinkTimer = null;
    this.blinkTween?.stop();
    this.blinkTween = null;
    this.isEyesClosed = false;
    this.isBlinking = false;
    this.blinkSquashY = 1;
    this.blinkNeedsRestore = false;
    this.blinkRestoreMinRemainingMs = 0;
    this.blinkRestoreOnComplete = null;
    if (this.creature) {
      this.applyCreatureVisualState();
    }
  }

  private scheduleNextBlink(delayMs?: number) {
    this.blinkTimer?.remove(false);
    const nextDelay = delayMs ?? Phaser.Math.Between(BLINK_INTERVAL_MIN_MS, BLINK_INTERVAL_MAX_MS);
    this.blinkTimer = this.time.delayedCall(nextDelay, () => {
      this.playBlinkSequence();
    });
  }

  private playBlinkSequence() {
    if (this.isFluttering || this.isLooking || this.isYawning || this.isJumping || this.isCrossfading || this.isSleeping) {
      this.scheduleNextBlink(Phaser.Math.Between(BLINK_BUSY_RETRY_MIN_MS, BLINK_BUSY_RETRY_MAX_MS));
      return;
    }
    if (this.isBlinking) return;
    this.isBlinking = true;

    this.runSingleBlink(() => {
      const shouldDoubleBlink = Math.random() < BLINK_DOUBLE_CHANCE;
      if (!shouldDoubleBlink) {
        this.isBlinking = false;
        this.scheduleNextBlink();
        return;
      }

      const pauseMs = Phaser.Math.Between(BLINK_DOUBLE_PAUSE_MIN_MS, BLINK_DOUBLE_PAUSE_MAX_MS);
      this.time.delayedCall(pauseMs, () => {
        this.runSingleBlink(() => {
          this.isBlinking = false;
          this.scheduleNextBlink();
        });
      });
    });
  }

  private runSingleBlink(onComplete: () => void) {
    const closeMs = Phaser.Math.Between(BLINK_CLOSE_MIN_MS, BLINK_CLOSE_MAX_MS);
    const holdMs = Phaser.Math.Between(BLINK_HOLD_MIN_MS, BLINK_HOLD_MAX_MS);
    const openMs = Phaser.Math.Between(BLINK_OPEN_MIN_MS, BLINK_OPEN_MAX_MS);

    this.blinkTween?.stop();
    this.blinkNeedsRestore = false;
    this.blinkRestoreMinRemainingMs = 0;
    this.blinkRestoreOnComplete = null;
    this.setEyesClosed(true);

    this.blinkTween = this.tweens.add({
      targets: this,
      blinkSquashY: BLINK_SQUASH_RATIO,
      duration: closeMs,
      ease: "Quad.easeIn",
      onComplete: () => {
        this.time.delayedCall(holdMs, () => {
          this.setEyesClosed(false);
          this.blinkNeedsRestore = true;
          this.blinkRestoreMinRemainingMs = openMs;
          this.blinkRestoreOnComplete = onComplete;
        });
      },
    });
  }

  private stopYawnLoop() {
    this.yawnTimer?.remove(false);
    this.yawnTimer = null;
    this.yawnStepTimer?.remove(false);
    this.yawnStepTimer = null;
    this.yawnTween?.stop();
    this.yawnTween = null;
    this.isYawning = false;
    this.yawnFrameIndex = 0;
    this.yawnPoseProxy.value = 0;
    this.yawnPoseValue = 0;
    this.yawnReturnBias = 0;
    if (this.creature) {
      this.applyCreatureVisualState();
    }
  }

  private scheduleNextYawn(delayMs?: number) {
    this.yawnTimer?.remove(false);
    const nextDelay = delayMs ?? Phaser.Math.Between(YAWN_INTERVAL_MIN_MS, YAWN_INTERVAL_MAX_MS);
    this.yawnTimer = this.time.delayedCall(nextDelay, () => {
      this.playYawnSequence();
    });
  }

  private playYawnSequence() {
    if (this.isYawning) return;
    if (this.isLooking || this.isBlinking || this.isFluttering || this.isJumping || this.isSleeping) {
      this.scheduleNextYawn(Phaser.Math.Between(1400, 2600));
      return;
    }
    this.isYawning = true;

    const enterMs = Phaser.Math.Between(YAWN_ENTER_MIN_MS, YAWN_ENTER_MAX_MS);
    const holdMs = Phaser.Math.Between(YAWN_HOLD_MIN_MS, YAWN_HOLD_MAX_MS);
    const exitMs = Phaser.Math.Between(YAWN_EXIT_MIN_MS, YAWN_EXIT_MAX_MS);

    const steps: Array<{ frame: number; duration: number }> = [
      { frame: 0, duration: enterMs },
      { frame: 1, duration: enterMs },
      { frame: 2, duration: enterMs },
      { frame: 3, duration: holdMs },
      { frame: 2, duration: exitMs },
      { frame: 1, duration: exitMs },
      { frame: 0, duration: exitMs },
    ];

    let stepIndex = 0;
    const runStep = () => {
      if (!this.isYawning) return;
      const step = steps[stepIndex];
      if (!step) {
        this.finishYawn();
        return;
      }

      this.yawnFrameIndex = step.frame;
      this.applyCreatureVisualState();
      this.applyYawnPose(step.frame, step.duration);
      stepIndex += 1;
      this.yawnStepTimer = this.time.delayedCall(step.duration, runStep);
    };

    runStep();
  }

  private applyYawnPose(frameIndex: number, durationMs: number) {
    const targetPose = frameIndex >= 3 ? 1 : frameIndex >= 2 ? 0.72 : frameIndex >= 1 ? 0.38 : 0;
    const tweenDuration = Phaser.Math.Clamp(Math.floor(durationMs * 0.75), 80, 220);
    this.yawnTween?.stop();
    this.yawnTween = this.tweens.add({
      targets: this.yawnPoseProxy,
      value: targetPose,
      duration: tweenDuration,
      ease: frameIndex >= 2 ? "Back.easeOut" : "Cubic.easeOut",
    });
  }

  private finishYawn() {
    this.yawnStepTimer?.remove(false);
    this.yawnStepTimer = null;
    this.yawnTween?.stop();
    this.yawnTween = this.tweens.add({
      targets: this.yawnPoseProxy,
      value: 0,
      duration: 180,
      ease: "Back.easeOut",
    });

    // Add a tiny return overshoot, then let damped angle settling complete the motion.
    this.yawnReturnBias = -0.38;
    this.isYawning = false;
    this.yawnFrameIndex = 0;
    this.applyCreatureVisualState();
    this.scheduleNextBlink(Phaser.Math.Between(BLINK_AFTER_ACTION_MIN_MS, BLINK_AFTER_ACTION_MAX_MS));
    this.scheduleNextYawn();
  }
}

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width,
      height,
      parent: containerRef.current,
      backgroundColor: "#000000",
      ...GLOBAL_RENDER_EFFECTS,
      render: {
        powerPreference: "high-performance",
        desynchronized: true,
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: MainScene,
    });

    let latestTaskRunning = false;
    const applyTaskState = () => {
      const scene = getMainScene(gameRef.current);
      if (!scene) return false;
      scene.setTaskRunning(latestTaskRunning);
      return true;
    };

    const sceneSyncInterval = window.setInterval(() => {
      if (applyTaskState()) {
        window.clearInterval(sceneSyncInterval);
      }
    }, 120);

    const stream = new EventSource("/api/cron/jobs/stream");
    const onJobsEvent = (event: Event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as CronPayload;
        latestTaskRunning = hasRunningTask(payload);
        applyTaskState();
      } catch {
        // Ignore malformed stream payloads.
      }
    };
    stream.addEventListener("jobs", onJobsEvent);

    return () => {
      window.clearInterval(sceneSyncInterval);
      stream.removeEventListener("jobs", onJobsEvent);
      stream.close();
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        overflow: "hidden",
      }}
    />
  );
}
