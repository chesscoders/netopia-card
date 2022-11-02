import { Form, Formik } from "formik";
import { useState } from "react";
import Netopia from "./Netopia";
// ...

const FinishOrderForm = () => {
  const [netopia, setNetopia] = useState({});
  const mutation = useMutation(() => axios.post(`orders`, data), {
    successCallback: ({ data }) => {
      setNetopia(data);
    },
  });

  const handleSubmit = (data) => {
    return mutation.mutateAsync(data);
  };

  return (
    <Formik
      initialValues={initialValues}
      key={someKey}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
    >
      <Form>
        {/* ... */}
        <Netopia {...netopia} />
        {/* ... */}
      </Form>
    </Formik>
  );
};

export default FinishOrderForm;
