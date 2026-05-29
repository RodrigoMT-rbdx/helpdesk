import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const schema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof schema>;

type CreateUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function CreateUserDialog({
  open,
  onOpenChange,
}: CreateUserDialogProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      await axios.post("/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      reset();
      onOpenChange(false);
    },
    onError: (error) => {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error
        : null;
      setServerError(message ?? "Failed to create user");
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset();
      setServerError(null);
    }
    onOpenChange(next);
  }

  function onSubmit(data: FormData) {
    setServerError(null);
    mutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New user</DialogTitle>
          <DialogDescription>
            Create a new agent account. They can sign in with the email and
            password you set here.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} aria-invalid={!!errors.name} />
            {errors.name && (
              <Alert variant="destructive" className="py-1.5">
                <AlertDescription>{errors.name.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="off"
              {...register("email")}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <Alert variant="destructive" className="py-1.5">
                <AlertDescription>{errors.email.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <Alert variant="destructive" className="py-1.5">
                <AlertDescription>{errors.password.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
