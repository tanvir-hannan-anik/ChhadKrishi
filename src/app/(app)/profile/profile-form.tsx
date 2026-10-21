"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Bell, BellOff, Camera, Info, LocateFixed, MapPin, Save, Sprout, Trash2, X } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { toast } from "@/components/app/toaster";
import { Card, FieldError, FieldLabel, Spinner, inputClass, primaryButton, secondaryButton } from "@/components/app/ui";
import { EASE_OUT } from "@/components/motion/reveal";
import { conditionLabel, formatTemp, placeName } from "@/components/weather/format";
import { WeatherGlyph } from "@/components/weather/weather-art";
import { authClient } from "@/lib/auth/client";
import { apiFetch } from "@/lib/client-api";
import { formatNumber } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/language-context";
import { currentSubscription, disablePush, enablePush, pushState, type PushState } from "@/lib/notifications/push-client";
import type { Profile } from "@/lib/profile/store";
import { normalizeDigits } from "@/lib/validation";
import { refreshWeather, useWeather } from "@/lib/weather/client";
import { conditionOf } from "@/lib/weather/model";

type Field = "name" | "gardeningYears";
type Coords = { latitude: number; longitude: number; placeLabel: string };

const AVATAR_SIZE = 256;
const noopSubscribe = () => () => {};

/** Center-crops and shrinks a photo to a small square WebP (JPEG where WebP can't be encoded). */
async function avatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = AVATAR_SIZE;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  const webp = canvas.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85);
}

/** `pushAvailable`: the server has push keys; without them the device-notification card is hidden. */
export function ProfileForm({
  name: initialName,
  email,
  image: initialImage,
  profile,
  pushAvailable,
}: {
  name: string;
  email: string;
  image: string | null;
  profile: Profile;
  pushAvailable: boolean;
}) {
  const { t, lang } = useLanguage();
  const p = t.profile;
  const router = useRouter();
  const [image, setImage] = useState(initialImage);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(initialName);
  const [address, setAddress] = useState(profile.address);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [years, setYears] = useState(profile.gardeningYears === null ? "" : formatNumber(profile.gardeningYears, lang));
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Field[]>([]);

  const yearsValue = years.trim() === "" ? null : Number(normalizeDigits(years.trim()));
  const level = yearsValue === null || Number.isNaN(yearsValue) ? null : yearsValue < 1 ? "new" : yearsValue < 3 ? "learning" : yearsValue < 10 ? "experienced" : "expert";

  const refreshSession = () => authClient.$store.notify("$sessionSignal");

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    let dataUrl: string;
    try {
      dataUrl = await avatarDataUrl(file);
    } catch {
      setPhotoBusy(false);
      return toast(p.photoInvalid, "error");
    }
    const result = await apiFetch<{ image: string }>("/api/profile/avatar", { method: "PUT", json: { dataUrl } });
    setPhotoBusy(false);
    if (result.ok) {
      setImage(result.data.image);
      refreshSession();
      toast(p.photoSaved);
    } else if (result.status !== 401) toast(result.error === "IMAGE_INVALID" ? p.photoInvalid : t.common.errors.GENERIC, "error");
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    const result = await apiFetch("/api/profile/avatar", { method: "DELETE" });
    setPhotoBusy(false);
    if (result.ok) {
      setImage(null);
      refreshSession();
      toast(p.photoRemoved);
    } else if (result.status !== 401) toast(t.common.errors.GENERIC, "error");
  };

  const useLiveLocation = () => {
    if (!("geolocation" in navigator)) return toast(p.locationUnsupported, "error");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: position }) => {
        const latitude = Number(position.latitude.toFixed(5));
        const longitude = Number(position.longitude.toFixed(5));
        const result = await apiFetch<{ address: string; placeLabel: string }>("/api/profile/locate", { method: "POST", json: { latitude, longitude, lang } });
        setLocating(false);
        if (result.ok) {
          setAddress(result.data.address);
          setCoords({ latitude, longitude, placeLabel: result.data.placeLabel });
          toast(p.locationFilled);
        } else if (result.status !== 401) toast(p.locationFailed, "error");
      },
      (error) => {
        setLocating(false);
        toast(error.code === error.PERMISSION_DENIED ? p.locationDenied : p.locationFailed, "error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const local: Field[] = [];
    if (name.trim().length < 2) local.push("name");
    if (yearsValue !== null && (!Number.isInteger(yearsValue) || yearsValue < 0 || yearsValue > 80)) local.push("gardeningYears");
    setErrors(local);
    if (local.length) return;

    setSaving(true);
    const result = await apiFetch<{ profile: Profile; located: boolean }>("/api/profile", {
      method: "PUT",
      json: {
        name: name.trim(),
        address: address.trim(),
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        placeLabel: coords?.placeLabel ?? "",
        gardeningYears: yearsValue,
        lang,
      },
    });
    setSaving(false);
    if (result.ok) {
      setCoords(null);
      refreshWeather();
      refreshSession();
      router.refresh();
      toast(address.trim() && !result.data.located ? p.savedNotLocated : p.saved, address.trim() && !result.data.located ? "error" : undefined);
    } else if (result.status !== 401) {
      setErrors((result.fields ?? []).filter((f): f is Field => f === "name" || f === "gardeningYears"));
      toast(t.common.errors[result.error === "VALIDATION_FAILED" ? "VALIDATION_FAILED" : result.error === "NETWORK" ? "NETWORK" : "GENERIC"], "error");
    }
  };

  const invalid = (field: Field) => ({ "aria-invalid": errors.includes(field), "aria-describedby": errors.includes(field) ? `${field}-error` : undefined });

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader title={(t) => t.appNav.profile} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 sm:py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_OUT }}>
          <h1 className="font-display text-2xl text-ink sm:text-4xl">{p.title}</h1>
          <p className="mt-1 text-sm text-ink-soft sm:mt-2 sm:text-base">{p.subtitle}</p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-6">
          <Card className="flex flex-col items-center text-center">
            <div className="relative">
              <span className="inline-flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-leaf to-forest font-display text-4xl text-paper shadow-lift ring-4 ring-white">
                {/* eslint-disable-next-line @next/next/no-img-element -- small private avatar from our API */}
                {image ? <img src={image} alt={p.photo} className="h-full w-full object-cover" /> : (name || email).trim().charAt(0).toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={photoBusy}
                aria-label={p.changePhoto}
                className="absolute right-0 bottom-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-forest text-paper shadow-soft ring-4 ring-white transition-transform hover:scale-105 disabled:opacity-70"
              >
                {photoBusy ? <Spinner /> : <Camera className="h-4 w-4" />}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => (void pickPhoto(e.target.files?.[0]), (e.target.value = ""))} />
            </div>
            <p className="mt-4 font-display text-xl text-ink">{name || initialName}</p>
            <p className="max-w-full truncate text-sm text-ink-faint">{email}</p>
            {level && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sprout/70 px-3 py-1 text-sm font-semibold text-forest">
                <Sprout className="h-4 w-4" /> {p.levels[level]}
                {yearsValue !== null && <span className="font-normal">· {formatNumber(yearsValue, lang)} {p.yearsSuffix}</span>}
              </p>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={photoBusy} className={`${secondaryButton} text-sm`}>
                <Camera className="h-4 w-4" /> {p.changePhoto}
              </button>
              {image && (
                <button type="button" onClick={() => void removePhoto()} disabled={photoBusy} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-clay hover:bg-clay/10 disabled:opacity-50">
                  <Trash2 className="h-4 w-4" /> {p.removePhoto}
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-ink-faint">{p.photoHint}</p>
            <WeatherPreview />
          </Card>

          <Card title={p.personal}>
            <form onSubmit={save} noValidate className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="profile-name">{p.name}</FieldLabel>
                  <input id="profile-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} {...invalid("name")} />
                  <FieldError id="name" message={errors.includes("name") ? p.nameError : null} />
                </div>
                <div>
                  <FieldLabel htmlFor="profile-email">{p.email}</FieldLabel>
                  <input id="profile-email" value={email} readOnly disabled className={inputClass} />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="profile-address">{p.address}</FieldLabel>
                <textarea
                  id="profile-address"
                  autoComplete="street-address"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={300}
                  placeholder={p.addressPlaceholder}
                  className={`${inputClass} resize-none`}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={useLiveLocation} disabled={locating} className={`${secondaryButton} text-sm`}>
                    {locating ? <Spinner /> : <LocateFixed className="h-4 w-4" />} {locating ? p.locating : p.useLocation}
                  </button>
                  {coords && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 py-1 pr-1 pl-3 text-xs font-medium text-sky-800 ring-1 ring-sky-200">
                      <MapPin className="h-3.5 w-3.5" /> {coords.placeLabel || `${coords.latitude}, ${coords.longitude}`}
                      <button type="button" onClick={() => setCoords(null)} aria-label={t.common.cancel} className="rounded-full p-0.5 hover:bg-sky-100">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-faint">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {p.addressHint}
                </p>
              </div>

              <div className="sm:max-w-xs">
                <FieldLabel htmlFor="profile-years">{p.years}</FieldLabel>
                <div className="relative">
                  <input
                    id="profile-years"
                    inputMode="numeric"
                    value={years}
                    onChange={(e) => setYears(e.target.value.replace(/[^\d০-৯]/g, "").slice(0, 2))}
                    placeholder={p.yearsPlaceholder}
                    className={`${inputClass} pr-16`}
                    {...invalid("gardeningYears")}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-ink-faint">{p.yearsSuffix}</span>
                </div>
                <FieldError id="gardeningYears" message={errors.includes("gardeningYears") ? p.yearsError : null} />
              </div>

              <button type="submit" disabled={saving} className={`${primaryButton} w-full sm:w-auto`}>
                {saving ? <Spinner /> : <Save className="h-4 w-4" />} {saving ? p.saving : p.save}
              </button>
            </form>
          </Card>
        </div>

        {pushAvailable && <PushSettings />}
      </main>
    </div>
  );
}

/** The weather the saved location currently resolves to. */
function WeatherPreview() {
  const { t, lang } = useLanguage();
  const { report } = useWeather();
  if (!report) return null;
  const condition = conditionOf(report.current.code);
  return (
    <p className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-50 px-3 py-2.5 text-sm text-sky-900 ring-1 ring-sky-100">
      <WeatherGlyph condition={condition} isDay={report.current.isDay} className="h-5 w-5 shrink-0" />
      <span className="min-w-0 truncate">
        {t.profile.weatherFor(placeName(t, report.place))} · {formatTemp(report.current.temperature, lang)} {conditionLabel(t, condition, report.current.isDay)}
      </span>
    </p>
  );
}

function PushSettings() {
  const { t, lang } = useLanguage();
  const p = t.profile;
  // Browser-only facts: null/false on the server, read for real once hydrated.
  const detected = useSyncExternalStore(noopSubscribe, pushState, () => null);
  const ios = useSyncExternalStore(noopSubscribe, () => /iPad|iPhone|iPod/.test(navigator.userAgent), () => false);
  const [changed, setPermission] = useState<PushState | null>(null);
  const permission = changed ?? detected;
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void currentSubscription().then((subscription) => active && setSubscribed(Boolean(subscription)));
    return () => {
      active = false;
    };
  }, []);

  const turnOn = async () => {
    setBusy(true);
    const result = await enablePush(lang);
    setBusy(false);
    setPermission(pushState());
    if (result === "ok") {
      setSubscribed(true);
      toast(p.pushOn);
    } else toast(result === "denied" ? p.pushBlocked : result === "unsupported" ? p.pushUnsupported : result === "not-configured" ? p.pushNotConfigured : p.pushFailed, "error");
  };

  const turnOff = async () => {
    setBusy(true);
    await disablePush();
    setBusy(false);
    setSubscribed(false);
  };

  return (
    <Card title={p.notificationsTitle}>
      <p className="text-sm text-ink-soft">{p.notificationsBody}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {permission === "unsupported" ? (
          <p className="text-sm text-clay">{ios ? p.iosHint : p.pushUnsupported}</p>
        ) : permission === "denied" ? (
          <p className="text-sm text-clay">{p.pushBlocked}</p>
        ) : subscribed ? (
          <>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-sprout/70 px-3 py-1.5 text-sm font-semibold text-forest">
              <Bell className="h-4 w-4" /> {p.pushOn}
            </p>
            <button type="button" onClick={() => void turnOff()} disabled={busy} className={`${secondaryButton} text-sm`}>
              {busy ? <Spinner /> : <BellOff className="h-4 w-4" />} {p.disablePush}
            </button>
          </>
        ) : (
          permission !== null && (
            <button type="button" onClick={() => void turnOn()} disabled={busy} className={primaryButton}>
              {busy ? <Spinner /> : <Bell className="h-4 w-4" />} {busy ? p.enablingPush : p.enablePush}
            </button>
          )
        )}
      </div>
    </Card>
  );
}
