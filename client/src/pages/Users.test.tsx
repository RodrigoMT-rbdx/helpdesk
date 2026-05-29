import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import axios from "axios";
import { renderWithProviders } from "@/test/utils";
import Users from "./Users";

// The page fetches through axios.get; mock the module so no real network
// request is made and each test controls the resolved/rejected value.
vi.mock("axios");
const mockedGet = vi.mocked(axios.get);

const sampleUsers = [
  {
    id: "1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "admin",
    createdAt: "2024-01-15T10:00:00.000Z",
  },
  {
    id: "2",
    name: "Grace Hopper",
    email: "grace@example.com",
    role: "agent",
    createdAt: "2024-03-22T10:00:00.000Z",
  },
];

function resolveWith(users: typeof sampleUsers) {
  mockedGet.mockResolvedValue({ data: { users } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Users page", () => {
  it("always renders the page heading", () => {
    resolveWith([]);
    renderWithProviders(<Users />);

    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
  });

  it("requests users from the correct endpoint", () => {
    resolveWith(sampleUsers);
    renderWithProviders(<Users />);

    expect(mockedGet).toHaveBeenCalledWith("/api/users");
  });

  it("shows loading skeletons while the query is pending", () => {
    // A never-resolving promise keeps the query in its pending state.
    mockedGet.mockReturnValue(new Promise(() => {}));
    const { container } = renderWithProviders(<Users />);

    // The loading state renders a table of skeleton placeholders, not data.
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBe(
      20,
    );
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  it("renders a row for each user once loaded", async () => {
    resolveWith(sampleUsers);
    renderWithProviders(<Users />);

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("grace@example.com")).toBeInTheDocument();

    // 2 data rows + 1 header row.
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("renders the column headers", async () => {
    resolveWith(sampleUsers);
    renderWithProviders(<Users />);

    await screen.findByText("Ada Lovelace");

    for (const header of ["Name", "Email", "Role", "Joined"]) {
      expect(
        screen.getByRole("columnheader", { name: header }),
      ).toBeInTheDocument();
    }
  });

  it("styles the role badge by role", async () => {
    resolveWith(sampleUsers);
    renderWithProviders(<Users />);

    const adminRow = (await screen.findByText("Ada Lovelace")).closest("tr")!;
    const agentRow = screen.getByText("Grace Hopper").closest("tr")!;

    expect(within(adminRow).getByText("admin")).toBeInTheDocument();
    expect(within(agentRow).getByText("agent")).toBeInTheDocument();
  });

  it("formats the joined date as a localized string", async () => {
    resolveWith([sampleUsers[0]]);
    renderWithProviders(<Users />);

    await screen.findByText("Ada Lovelace");

    expect(screen.getByText("Jan 15, 2024")).toBeInTheDocument();
  });

  it("shows an empty state when there are no users", async () => {
    resolveWith([]);
    renderWithProviders(<Users />);

    expect(await screen.findByText("No users found.")).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    mockedGet.mockRejectedValue(new Error("Network down"));
    renderWithProviders(<Users />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Network down");
  });

  it("does not show data or empty state while loading", async () => {
    mockedGet.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Users />);

    await waitFor(() => {
      expect(screen.queryByText("No users found.")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
