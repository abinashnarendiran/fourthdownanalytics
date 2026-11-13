"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePassword } from "@/api/profile";
import { passwordSchema, type PasswordFormValues } from "@/schemas/profile";
import { applyServerError, profileStyles as s } from "./styles";
import { PasswordInput } from "./PasswordInput";

export const SecurityForm = () => {
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: PasswordFormValues) => {
    setFormError(null);
    setSuccess(false);
    const [error] = await changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    if (error) {
      setFormError(
        applyServerError(error, setError, ["currentPassword", "newPassword"]),
      );
      return;
    }
    reset();
    setSuccess(true);
  };

  return (
    <section className={s.card}>
      <h3 className={s.title}>Security</h3>
      <p className={s.description}>
        Change your password. You must confirm your current password.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        autoComplete="off"
        noValidate
      >
        {formError && (
          <div className={`${s.banner} ${s.errorBanner}`}>{formError}</div>
        )}
        {success && (
          <div className={`${s.banner} ${s.successBanner}`}>
            Password updated.
          </div>
        )}

        <div>
          <label htmlFor="current-password" className={s.label}>
            Current password
          </label>
          <PasswordInput
            id="current-password"
            autoComplete="current-password"
            {...register("currentPassword")}
          />
          {errors.currentPassword && (
            <p className={s.error}>{errors.currentPassword.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="new-password" className={s.label}>
            New password
          </label>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            {...register("newPassword")}
          />
          {errors.newPassword && (
            <p className={s.error}>{errors.newPassword.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirm-password" className={s.label}>
            Confirm new password
          </label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className={s.error}>{errors.confirmPassword.message}</p>
          )}
        </div>

        <button type="submit" disabled={isSubmitting} className={s.button}>
          {isSubmitting ? "Updating..." : "Update password"}
        </button>
      </form>
    </section>
  );
};
