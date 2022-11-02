import { useEffect, useRef } from "react";

const Netopia = ({ data, env_key, url }) => {
  const ref = useRef();

  useEffect(() => {
    if (ref && data && env_key && url) {
      ref.current.submit();
    }
  }, [data, env_key, url]);

  return (
    <form
      action={url}
      className="hidden"
      method="POST"
      name="frmPaymentRedirect"
      ref={ref}
    >
      <input name="env_key" type="hidden" value={env_key} />
      <input name="data" type="hidden" value={data} />
    </form>
  );
};

export default Netopia;
