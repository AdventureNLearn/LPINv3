import { useMemo, useState } from "react";
import {
  Building2,
  Mail,
  Phone,
  Printer,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  contactRoleLabel,
  divisionLabel,
  TRADE_DIVISIONS,
} from "@/lib/jobsite/divisions";
import { printContacts } from "@/lib/jobsite/pdf";
import { useJobsiteStore } from "@/lib/jobsite/store";
import type { ContactRole, TradeDivision } from "@/lib/jobsite/types";
import { cn } from "@/lib/utils";

export function ContactsView() {
  const jobsite = useJobsiteStore((s) => s.jobsite);
  const addContact = useJobsiteStore((s) => s.addContact);
  const updateContact = useJobsiteStore((s) => s.updateContact);
  const removeContact = useJobsiteStore((s) => s.removeContact);
  const setView = useJobsiteStore((s) => s.setView);

  const contacts = jobsite.contacts ?? [];
  const byDivision = useMemo(() => {
    const map = new Map<TradeDivision, typeof contacts>();
    for (const c of contacts) {
      const list = map.get(c.division) ?? [];
      list.push(c);
      map.set(c.division, list);
    }
    return [...map.entries()].sort((a, b) =>
      divisionLabel(a[0]).localeCompare(divisionLabel(b[0])),
    );
  }, [contacts]);

  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [division, setDivision] = useState<TradeDivision>("mechanical");
  const [role, setRole] = useState<ContactRole>("subcontractor");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState("");
  const [inventoryNotes, setInventoryNotes] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");
  const [leadTime, setLeadTime] = useState("");

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !contactName.trim()) {
      toast.error("Company and contact name are required.");
      return;
    }
    addContact({
      company: company.trim(),
      contactName: contactName.trim(),
      division,
      role,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      scope: scope.trim(),
      inventoryNotes: inventoryNotes.trim() || undefined,
      conditionNotes: conditionNotes.trim() || undefined,
      leadTime: leadTime.trim() || undefined,
    });
    setCompany("");
    setContactName("");
    setPhone("");
    setEmail("");
    setScope("");
    setInventoryNotes("");
    setConditionNotes("");
    setLeadTime("");
    toast.success("Contact added to this jobsite.");
  }

  return (
    <div className="animate-enter space-y-4 sm:space-y-6">
      <header className="space-y-2">
        <span className="lpin-chip">
          <Users className="size-3" />
          Vendors · divisions
        </span>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight text-fg sm:text-3xl">
              Project contacts
            </h1>
            <p className="mt-1 text-sm text-fg-muted text-pretty">
              Track vendors and subs by trade division — inventory, lead times,
              and site conditions in one place so the whole team has visibility.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setView("schedule")}
            >
              Open schedule
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                try {
                  printContacts(jobsite);
                  toast.message("Print dialog — Save as PDF.");
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Print failed.",
                  );
                }
              }}
            >
              <Printer className="size-3.5" />
              Print / PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Division summary chips */}
      <div className="chip-scroll">
        {byDivision.map(([div, list]) => (
          <span
            key={div}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface-1 px-3 text-xs font-medium text-fg-muted"
          >
            {divisionLabel(div)}
            <span className="text-gold">{list.length}</span>
          </span>
        ))}
        {byDivision.length === 0 ? (
          <span className="text-xs text-fg-subtle">No divisions yet</span>
        ) : null}
      </div>

      <form onSubmit={onAdd} className="card-lpin space-y-3 rounded-2xl p-4">
        <p className="text-sm font-medium text-fg">Add vendor / contact</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Company</span>
            <input
              className="field-input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Contact person</span>
            <input
              className="field-input"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Name"
            />
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Division / trade</span>
            <select
              className="field-input"
              value={division}
              onChange={(e) => setDivision(e.target.value as TradeDivision)}
            >
              {TRADE_DIVISIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Role</span>
            <select
              className="field-input"
              value={role}
              onChange={(e) => setRole(e.target.value as ContactRole)}
            >
              <option value="subcontractor">Subcontractor</option>
              <option value="vendor">Vendor</option>
              <option value="supplier">Supplier</option>
              <option value="inspector">Inspector / third party</option>
              <option value="owner_rep">Owner’s rep</option>
              <option value="internal">Internal / crew</option>
            </select>
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Phone</span>
            <input
              className="field-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Email</span>
            <input
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-fg-subtle">Scope of work / supply</span>
          <input
            className="field-input"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="What they own on this job"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-fg-subtle">
            Inventory / material status (team-visible)
          </span>
          <textarea
            className="field-input"
            value={inventoryNotes}
            onChange={(e) => setInventoryNotes(e.target.value)}
            placeholder="On site, short, PO status…"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-fg-subtle">
            Site conditions affecting this vendor
          </span>
          <textarea
            className="field-input"
            value={conditionNotes}
            onChange={(e) => setConditionNotes(e.target.value)}
            placeholder="Access, weather, holds, readiness…"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-fg-subtle">Lead time / delivery</span>
          <input
            className="field-input"
            value={leadTime}
            onChange={(e) => setLeadTime(e.target.value)}
            placeholder="e.g. 5 days after PO"
          />
        </label>
        <Button type="submit" className="w-full">
          <Plus />
          Add contact
        </Button>
      </form>

      <section className="space-y-4">
        {byDivision.map(([div, list]) => (
          <div key={div} className="space-y-2">
            <h2 className="text-sm font-medium text-gold">
              {divisionLabel(div)}
              <span className="ml-2 text-xs font-normal text-fg-subtle">
                {list.length}
              </span>
            </h2>
            {list.map((c) => (
              <article
                key={c.id}
                className={cn(
                  "card-lpin rounded-2xl p-4",
                  !c.active && "opacity-60",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">{contactRoleLabel(c.role)}</Badge>
                  {!c.active ? (
                    <Badge variant="default">Inactive</Badge>
                  ) : null}
                </div>
                <h3 className="mt-2 flex items-center gap-2 text-sm font-medium text-fg">
                  <Building2 className="size-3.5 text-gold" />
                  {c.company}
                </h3>
                <p className="text-xs text-fg-muted">{c.contactName}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-fg-subtle">
                  {c.phone ? (
                    <a
                      href={`tel:${c.phone}`}
                      className="inline-flex items-center gap-1 text-gold"
                    >
                      <Phone className="size-3" />
                      {c.phone}
                    </a>
                  ) : null}
                  {c.email ? (
                    <a
                      href={`mailto:${c.email}`}
                      className="inline-flex items-center gap-1 text-gold"
                    >
                      <Mail className="size-3" />
                      {c.email}
                    </a>
                  ) : null}
                </div>
                {c.scope ? (
                  <p className="mt-2 text-sm text-fg-muted text-pretty">
                    <strong className="text-fg">Scope:</strong> {c.scope}
                  </p>
                ) : null}
                {c.inventoryNotes ? (
                  <p className="mt-1 text-sm text-fg-muted text-pretty">
                    <strong className="text-fg">Inventory:</strong>{" "}
                    {c.inventoryNotes}
                  </p>
                ) : null}
                {c.conditionNotes ? (
                  <p className="mt-1 text-sm text-fg-muted text-pretty">
                    <strong className="text-fg">Conditions:</strong>{" "}
                    {c.conditionNotes}
                  </p>
                ) : null}
                {c.leadTime ? (
                  <p className="mt-1 text-xs text-fg-subtle">
                    Lead time: {c.leadTime}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      updateContact(c.id, { active: !c.active });
                      toast.message(c.active ? "Marked inactive." : "Marked active.");
                    }}
                  >
                    {c.active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      removeContact(c.id);
                      toast.message("Contact removed.");
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ))}
        {contacts.length === 0 ? (
          <p className="text-sm text-fg-subtle">
            No contacts yet — add the first vendor for a division above.
          </p>
        ) : null}
      </section>
    </div>
  );
}
