import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { renderWithProviders } from "@/test/utils";
import CreateUserDialog from "./CreateUserDialog";

// The dialog submits through axios.post; mock the module so no real network
// request is made and each test controls the resolved/rejected value.
vi.mock("axios");
const mockedPost = vi.mocked(axios.post);
const mockedIsAxiosError = vi.mocked(axios.isAxiosError);

function renderOpen(onOpenChange = vi.fn()) {
  return {
    onOpenChange,
    ...renderWithProviders(
      <CreateUserDialog open onOpenChange={onOpenChange} />,
    ),
  };
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  { name, email, password }: { name: string; email: string; password: string },
) {
  await user.type(screen.getByLabelText("Name"), name);
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CreateUserDialog", () => {
  it("renders the three input fields when open", () => {
    renderOpen();

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("shows validation errors and does not submit when fields are empty", async () => {
    const user = userEvent.setup();
    renderOpen();

    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(
      await screen.findByText("Name must be at least 3 characters"),
    ).toBeInTheDocument();
    expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    expect(
      screen.getByText("Password must be at least 8 characters"),
    ).toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("rejects a too-short name and too-short password", async () => {
    const user = userEvent.setup();
    renderOpen();

    await fillForm(user, {
      name: "Al",
      email: "al@example.com",
      password: "short",
    });
    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(
      await screen.findByText("Name must be at least 3 characters"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Password must be at least 8 characters"),
    ).toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("posts to /api/users and closes the dialog on success", async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue({ data: { user: {} } });
    const { onOpenChange } = renderOpen();

    await fillForm(user, {
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "password123",
    });
    await user.click(screen.getByRole("button", { name: "Create user" }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith("/api/users", {
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "password123",
      });
    });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("shows the server error message when creation fails", async () => {
    const user = userEvent.setup();
    mockedIsAxiosError.mockReturnValue(true);
    mockedPost.mockRejectedValue({
      response: { data: { error: "A user with this email already exists" } },
    });
    const { onOpenChange } = renderOpen();

    await fillForm(user, {
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "password123",
    });
    await user.click(screen.getByRole("button", { name: "Create user" }));

    const alert = await screen.findByText(
      "A user with this email already exists",
    );
    expect(alert).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
