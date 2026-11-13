"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfile } from "@/api/profile";
import {
  generalInfoSchema,
  type GeneralInfoFormValues,
} from "@/schemas/profile";
import type { User } from "@/types/domain/user";
import { applyServerError, profileStyles as s } from "./styles";

interface Props {
  defaultValues: GeneralInfoFormValues;
  onUpdated: (user: User) => void;
}

export const GeneralInfoForm = ({ defaultValues, onUpdated }: Props) => {
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<GeneralInfoFormValues>({
    resolver: zodResolver(generalInfoSchema),
    defaultValues,
  });

  const onSubmit = async (values: GeneralInfoFormValues) => {
    setFormError(null);
    setSuccess(false);
    const [error, user] = await updateProfile(values);
    if (error || !user) {
      setFormError(
        error
          ? applyServerError(error, setError, ["name", "email"])
          : "Update failed",
      );
      return;
    }
    reset({ name: user.name, email: user.email });
    onUpdated(user);
    setSuccess(true);
  };

  return (
    <section className={s.card}>
      <h3 className={s.title}>General Info</h3>
      <p className={s.description}>Update your name and email address.</p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        {formError && (
          <div className={`${s.banner} ${s.errorBanner}`}>{formError}</div>
        )}
        {success && (
          <div className={`${s.banner} ${s.successBanner}`}>
            Profile updated.
          </div>
        )}

        <div>
          <label htmlFor="profile-name" className={s.label}>
            Name
          </label>
          <input
            id="profile-name"
            type="text"
            autoComplete="name"
            className={s.input}
            {...register("name")}
          />
          {errors.name && <p className={s.error}>{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="profile-email" className={s.label}>
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            autoComplete="email"
            className={s.input}
            {...register("email")}
          />
          {errors.email && <p className={s.error}>{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className={s.button}
        >
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
      </form>
    </section>
  );
};
