import type { MyTicket } from "@mind-do/shared";
import { useEffect, useState } from "react";
import { getMyTickets } from "../lib/api";

export function useMyTickets() {
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void getMyTickets()
      .then((result) => {
        if (active) setTickets(result.tickets);
      })
      .catch(() => {
        if (active) {
          setTickets([]);
          setFailed(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  return {
    tickets,
    loading,
    failed,
    reload: () => setAttempt((value) => value + 1),
  };
}
