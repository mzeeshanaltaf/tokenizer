"use client";

import { useState } from "react";
import {
  CheckCircleIcon,
  PaperPlaneTiltIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Status = "idle" | "loading" | "success" | "error";

type Props = {
  initialSuccess?: boolean;
  initialError?: string;
};

export function ContactForm({ initialSuccess = false, initialError }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot value. Kept in state so the hydrated React submit forwards it too.
  // The field name is deliberately non-semantic ("hp_field") so browser/Google
  // autofill does not recognise it as a real field and pre-populate it.
  const [hpField, setHpField] = useState("");

  const [status, setStatus] = useState<Status>(
    initialSuccess ? "success" : initialError ? "error" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState(initialError ?? "");

  // When React is hydrated, onSubmit intercepts and uses fetch (enhanced UX).
  // When hydration fails, the native action="/api/contact" POST fires instead.
  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus("error");
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, hp_field: hpField }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(data.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Failed to send. Check your connection and try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl bg-primary/5 px-6 py-12 text-center ring-1 ring-primary/15">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/15">
          <CheckCircleIcon size={24} weight="bold" className="text-primary" />
        </span>
        <h2 className="text-lg font-semibold">Message sent</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Thanks for the feedback, we read every message and will get back to
          you if a reply is needed.
        </p>
        <button
          type="button"
          onClick={() => {
            setName("");
            setEmail("");
            setMessage("");
            setStatus("idle");
          }}
          className="mt-2 text-sm font-medium text-primary transition-colors hover:underline"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      action="/api/contact"
      method="post"
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      {/* Honeypot: visually hidden, off the a11y tree, off the tab order, and
          autocomplete disabled. Real users never see or fill it; bots that
          auto-fill every input get flagged server-side. */}
      <div
        aria-hidden="true"
        className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="hp_field">Leave this field empty</label>
        <input
          id="hp_field"
          name="hp_field"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={hpField}
          onChange={(e) => setHpField(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="message">Message / Feedback</Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={6}
          maxLength={5000}
          placeholder="Share your feedback, a bug report, or a feature idea..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="resize-y"
        />
      </div>

      {status === "error" && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          {errorMsg}
        </p>
      )}

      <Button
        type="submit"
        disabled={status === "loading"}
        size="lg"
        className="justify-center"
      >
        {status === "loading" ? (
          <SpinnerGapIcon size={16} weight="bold" className="animate-spin" />
        ) : (
          <PaperPlaneTiltIcon size={16} weight="bold" />
        )}
        {status === "loading" ? "Sending..." : "Send message"}
      </Button>
    </form>
  );
}
