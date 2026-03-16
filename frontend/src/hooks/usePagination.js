import { useMemo, useState } from "react";

function usePagination(data = [], pageSize = 6) {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const pagedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  return {
    page,
    setPage,
    totalPages,
    pagedData
  };
}

export default usePagination;
