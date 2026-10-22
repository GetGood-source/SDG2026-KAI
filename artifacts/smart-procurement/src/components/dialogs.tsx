import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCreateRequest, useCreateSupplier, useSaveInventory, useAddQuote } from "@workspace/api-client-react";
import type { RequestInput, InventoryItem, Supplier } from "@workspace/api-client-react";
import { useInvalidateWorkspace } from "@/lib/proc";
import { Field, inputCls, Btn } from "@/components/kit";
import { useToast } from "@/hooks/use-toast";

function Shell({ open, onOpenChange, title, desc, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; desc: string; children: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong";
}

function defaultDeadline() {
  const d = new Date(Date.now() + 48 * 36e5);
  d.setMinutes(0, 0, 0);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export function NewRequestDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated?: (id: number) => void }) {
  const m = useCreateRequest();
  const inv = useInvalidateWorkspace();
  const { toast } = useToast();
  const [f, setF] = useState({ partName: "", model: "", neededBy: defaultDeadline(), description: "", quantity: "1", requestedBy: "", priority: "urgent" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const valid = f.partName && f.model && f.description && f.requestedBy && Number(f.quantity) >= 1 && f.neededBy;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const data: RequestInput = { ...f, quantity: Number(f.quantity), neededBy: new Date(f.neededBy).toISOString(), priority: f.priority as RequestInput["priority"] };
    m.mutate({ data }, {
      onSuccess: (r) => { inv(); toast({ title: `Request ${r.reference} logged` }); onOpenChange(false); onCreated?.(r.id); },
      onError: (e) => toast({ title: "Could not create request", description: errMsg(e), variant: "destructive" }),
    });
  };
  return (
    <Shell open={open} onOpenChange={onOpenChange} title="New part request" desc="Step 1 of 5. Describe what is needed and by when.">
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Field label="Part name"><input className={inputCls} value={f.partName} onChange={set("partName")} placeholder="Front brake pads" data-testid="input-part-name" /></Field></div>
        <Field label="Vehicle / model"><input className={inputCls} value={f.model} onChange={set("model")} placeholder="Toyota Vios 2019" data-testid="input-model" /></Field>
        <Field label="Quantity"><input type="number" min={1} className={inputCls} value={f.quantity} onChange={set("quantity")} data-testid="input-quantity" /></Field>
        <Field label="Needed by"><input type="datetime-local" className={inputCls} value={f.neededBy} onChange={set("neededBy")} data-testid="input-needed-by" /></Field>
        <Field label="Priority">
          <select className={inputCls} value={f.priority} onChange={set("priority")} data-testid="select-priority">
            <option value="normal">Normal</option><option value="urgent">Urgent</option><option value="critical">Critical</option>
          </select>
        </Field>
        <div className="col-span-2"><Field label="Requested by" hint="Free text. This workspace does not verify identities."><input className={inputCls} value={f.requestedBy} onChange={set("requestedBy")} placeholder="Name of mechanic" data-testid="input-requested-by" /></Field></div>
        <div className="col-span-2"><Field label="Description"><textarea rows={3} className={inputCls} value={f.description} onChange={set("description")} placeholder="Customer car on lift, OEM or equivalent acceptable" data-testid="input-description" /></Field></div>
        <div className="col-span-2 flex justify-end gap-2 pt-1">
          <Btn type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn type="submit" disabled={!valid || m.isPending} data-testid="button-submit-request">{m.isPending ? "Saving..." : "Log request"}</Btn>
        </div>
      </form>
    </Shell>
  );
}

export function SupplierDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated?: (s: Supplier) => void }) {
  const m = useCreateSupplier();
  const inv = useInvalidateWorkspace();
  const { toast } = useToast();
  const [f, setF] = useState({ name: "", email: "", category: "", rating: "4", leadHours: "24", location: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const valid = f.name && f.category && Number(f.rating) >= 0 && Number(f.rating) <= 5;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    m.mutate({ data: { ...f, rating: Number(f.rating), leadHours: Number(f.leadHours) } }, {
      onSuccess: (s) => { inv(); toast({ title: `${s.name} added to directory` }); onOpenChange(false); onCreated?.(s); setF({ name: "", email: "", category: "", rating: "4", leadHours: "24", location: "" }); },
      onError: (e) => toast({ title: "Could not add supplier", description: errMsg(e), variant: "destructive" }),
    });
  };
  return (
    <Shell open={open} onOpenChange={onOpenChange} title="Add supplier" desc="Record a supplier you have verified yourself. Nothing is sent to them.">
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Field label="Name"><input className={inputCls} value={f.name} onChange={set("name")} placeholder="Kedai Spare Part Jaya" data-testid="input-supplier-name" /></Field></div>
        <Field label="Email"><input type="email" className={inputCls} value={f.email} onChange={set("email")} data-testid="input-supplier-email" /></Field>
        <Field label="Category"><input className={inputCls} value={f.category} onChange={set("category")} placeholder="Brakes, electrical" data-testid="input-supplier-category" /></Field>
        <Field label="Rating (0-5)"><input type="number" step="0.1" min={0} max={5} className={inputCls} value={f.rating} onChange={set("rating")} data-testid="input-supplier-rating" /></Field>
        <Field label="Typical lead (hours)"><input type="number" min={0} className={inputCls} value={f.leadHours} onChange={set("leadHours")} data-testid="input-supplier-lead" /></Field>
        <div className="col-span-2"><Field label="Location"><input className={inputCls} value={f.location} onChange={set("location")} placeholder="Shah Alam, Selangor" data-testid="input-supplier-location" /></Field></div>
        <div className="col-span-2 flex justify-end gap-2 pt-1">
          <Btn type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn type="submit" disabled={!valid || m.isPending} data-testid="button-submit-supplier">{m.isPending ? "Saving..." : "Add supplier"}</Btn>
        </div>
      </form>
    </Shell>
  );
}

export function InventoryDialog({ open, onOpenChange, item }: { open: boolean; onOpenChange: (o: boolean) => void; item?: InventoryItem | null }) {
  const m = useSaveInventory();
  const inv = useInvalidateWorkspace();
  const { toast } = useToast();
  const [f, setF] = useState({ partName: item?.partName ?? "", model: item?.model ?? "", quantity: String(item?.quantity ?? 0), minimum: String(item?.minimum ?? 1), location: item?.location ?? "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const valid = f.partName && f.model && Number(f.quantity) >= 0 && Number(f.minimum) >= 0;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    m.mutate({ data: { ...f, quantity: Number(f.quantity), minimum: Number(f.minimum), ...(item ? { id: item.id } : {}) } }, {
      onSuccess: () => { inv(); toast({ title: item ? "Stock updated" : "Stock item added" }); onOpenChange(false); },
      onError: (e) => toast({ title: "Could not save", description: errMsg(e), variant: "destructive" }),
    });
  };
  return (
    <Shell open={open} onOpenChange={onOpenChange} title={item ? "Edit stock item" : "Add stock item"} desc="Stock counts are checked automatically when sourcing a request.">
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <Field label="Part name"><input className={inputCls} value={f.partName} onChange={set("partName")} data-testid="input-inv-part" /></Field>
        <Field label="Model"><input className={inputCls} value={f.model} onChange={set("model")} data-testid="input-inv-model" /></Field>
        <Field label="On hand"><input type="number" min={0} className={inputCls} value={f.quantity} onChange={set("quantity")} data-testid="input-inv-qty" /></Field>
        <Field label="Reorder at"><input type="number" min={0} className={inputCls} value={f.minimum} onChange={set("minimum")} data-testid="input-inv-min" /></Field>
        <div className="col-span-2"><Field label="Bin / location"><input className={inputCls} value={f.location} onChange={set("location")} placeholder="Rack B-3" data-testid="input-inv-location" /></Field></div>
        <div className="col-span-2 flex justify-end gap-2 pt-1">
          <Btn type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn type="submit" disabled={!valid || m.isPending} data-testid="button-submit-inventory">{m.isPending ? "Saving..." : "Save"}</Btn>
        </div>
      </form>
    </Shell>
  );
}

export function QuoteDialog({ open, onOpenChange, requestId, suppliers, presetSupplier, onAddSupplier }: { open: boolean; onOpenChange: (o: boolean) => void; requestId: number; suppliers: Supplier[]; presetSupplier?: number; onAddSupplier: () => void }) {
  const m = useAddQuote();
  const inv = useInvalidateWorkspace();
  const { toast } = useToast();
  const [f, setF] = useState({ supplierId: String(presetSupplier ?? suppliers[0]?.id ?? ""), price: "", shipping: "0", leadHours: "24", available: true, sourceUrl: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const valid = f.supplierId && Number(f.price) >= 0.01 && Number(f.shipping) >= 0 && Number(f.leadHours) >= 0;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    m.mutate({ id: requestId, data: { supplierId: Number(f.supplierId), price: Number(f.price), shipping: Number(f.shipping), leadHours: Number(f.leadHours), available: f.available, sourceUrl: f.sourceUrl } }, {
      onSuccess: () => { inv(); toast({ title: "Verified quote recorded" }); onOpenChange(false); },
      onError: (e) => toast({ title: "Could not add quote", description: errMsg(e), variant: "destructive" }),
    });
  };
  return (
    <Shell open={open} onOpenChange={onOpenChange} title="Record a verified quote" desc="Enter a price you confirmed by phone, chat or a supplier page.">
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Supplier">
            <div className="flex gap-2">
              <select className={inputCls} value={f.supplierId} onChange={set("supplierId")} data-testid="select-quote-supplier">
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}{s.isDemo ? " (demo)" : ""}</option>)}
              </select>
              <Btn type="button" variant="outline" onClick={onAddSupplier} className="whitespace-nowrap" data-testid="button-quote-new-supplier">New supplier</Btn>
            </div>
          </Field>
        </div>
        <Field label="Unit price"><input type="number" step="0.01" min={0} className={inputCls} value={f.price} onChange={set("price")} data-testid="input-quote-price" /></Field>
        <Field label="Shipping"><input type="number" step="0.01" min={0} className={inputCls} value={f.shipping} onChange={set("shipping")} data-testid="input-quote-shipping" /></Field>
        <Field label="Lead time (hours)"><input type="number" min={0} className={inputCls} value={f.leadHours} onChange={set("leadHours")} data-testid="input-quote-lead" /></Field>
        <Field label="Availability">
          <select className={inputCls} value={f.available ? "1" : "0"} onChange={(e) => setF({ ...f, available: e.target.value === "1" })} data-testid="select-quote-available">
            <option value="1">In stock</option><option value="0">Unavailable</option>
          </select>
        </Field>
        <div className="col-span-2"><Field label="Source URL or reference"><input className={inputCls} value={f.sourceUrl} onChange={set("sourceUrl")} placeholder="https://..." data-testid="input-quote-url" /></Field></div>
        <div className="col-span-2 flex justify-end gap-2 pt-1">
          <Btn type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn type="submit" disabled={!valid || m.isPending} data-testid="button-submit-quote">{m.isPending ? "Saving..." : "Record quote"}</Btn>
        </div>
      </form>
    </Shell>
  );
}
