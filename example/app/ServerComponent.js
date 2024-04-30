import { Button } from "./ClientComponent";
import { useTranslation } from "./useTranslation";
import { useEffect } from "react";

export function ServerComponent(props) {
  // should not error
  const t = useTranslation();

  useEffect(() => {
    console.log("no good");
  }, []);

  return <Button onClick={() => console.log(t, "hey")} {...props} />;
}
