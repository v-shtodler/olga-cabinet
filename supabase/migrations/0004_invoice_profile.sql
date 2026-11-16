-- Requisites printed on invoices (рахунок ФОП). All optional; the invoice page hides empty lines.
alter table settings
  add column if not exists fop_name       text,          -- "ФОП Войчик Ольга Іванівна"
  add column if not exists ipn            text,          -- РНОКПП
  add column if not exists iban           text,
  add column if not exists bank_name      text,
  add column if not exists legal_address  text,
  add column if not exists invoice_note   text;          -- footer line, e.g. "Без ПДВ. Платник єдиного податку 3 групи."
