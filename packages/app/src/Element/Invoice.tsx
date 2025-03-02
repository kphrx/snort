import "./Invoice.css";
import { useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { decode as invoiceDecode } from "light-bolt11-decoder";
import { useMemo } from "react";
import SendSats from "Element/SendSats";
import ZapCircle from "Icons/ZapCircle";
import useWebln from "Hooks/useWebln";

import messages from "./messages";

export interface InvoiceProps {
  invoice: string;
}

export default function Invoice(props: InvoiceProps) {
  const invoice = props.invoice;
  const webln = useWebln();
  const [showInvoice, setShowInvoice] = useState(false);
  const { formatMessage } = useIntl();

  const info = useMemo(() => {
    try {
      const parsed = invoiceDecode(invoice);

      const amountSection = parsed.sections.find(a => a.name === "amount");
      const amount = amountSection ? (amountSection.value as number) : NaN;

      const timestampSection = parsed.sections.find(a => a.name === "timestamp");
      const timestamp = timestampSection ? (timestampSection.value as number) : NaN;

      const expirySection = parsed.sections.find(a => a.name === "expiry");
      const expire = expirySection ? (expirySection.value as number) : NaN;
      const descriptionSection = parsed.sections.find(a => a.name === "description")?.value;
      const ret = {
        amount: !isNaN(amount) ? amount / 1000 : 0,
        expire: !isNaN(timestamp) && !isNaN(expire) ? timestamp + expire : null,
        description: descriptionSection as string | undefined,
        expired: false,
      };
      if (ret.expire) {
        ret.expired = ret.expire < new Date().getTime() / 1000;
      }
      return ret;
    } catch (e) {
      console.error(e);
    }
  }, [invoice]);

  const [isPaid, setIsPaid] = useState(false);
  const isExpired = info?.expired;
  const amount = info?.amount ?? 0;
  const description = info?.description;

  function header() {
    return (
      <>
        <h4>
          <FormattedMessage {...messages.Invoice} />
        </h4>
        <ZapCircle className="zap-circle" />
        <SendSats
          title={formatMessage(messages.PayInvoice)}
          invoice={invoice}
          show={showInvoice}
          onClose={() => setShowInvoice(false)}
        />
      </>
    );
  }

  async function payInvoice(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (webln?.enabled) {
      try {
        await webln.sendPayment(invoice);
        setIsPaid(true);
      } catch (error) {
        setShowInvoice(true);
      }
    } else {
      setShowInvoice(true);
    }
  }

  return (
    <>
      <div className={`note-invoice flex ${isExpired ? "expired" : ""} ${isPaid ? "paid" : ""}`}>
        <div className="invoice-header">{header()}</div>

        <p className="invoice-amount">
          {amount > 0 && (
            <>
              {amount.toLocaleString()} <span className="sats">sat{amount === 1 ? "" : "s"}</span>
            </>
          )}
        </p>

        <div className="invoice-body">
          {description && <p>{description}</p>}
          {isPaid ? (
            <div className="paid">
              <FormattedMessage {...messages.Paid} />
            </div>
          ) : (
            <button disabled={isExpired} type="button" onClick={payInvoice}>
              {isExpired ? <FormattedMessage {...messages.Expired} /> : <FormattedMessage {...messages.Pay} />}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
