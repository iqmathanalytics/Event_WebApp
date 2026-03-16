function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#F7F9FC]" />
      <div
        className="absolute inset-0 opacity-[0.2]"
        style={{
          background:
            "radial-gradient(120% 120% at 0% 0%, rgba(30, 41, 59, 0.18) 0%, rgba(30, 41, 59, 0) 58%), radial-gradient(130% 130% at 100% 100%, rgba(99, 102, 241, 0.16) 0%, rgba(99, 102, 241, 0) 62%)"
        }}
      />

      <div
        className="animate-bg-blob-a absolute -top-24 -left-20 h-[24rem] w-[24rem] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle at 30% 30%, rgba(30, 41, 59, 0.24), rgba(30, 41, 59, 0))"
        }}
      />
      <div
        className="animate-bg-blob-b absolute top-[18%] -right-24 h-[22rem] w-[22rem] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle at 50% 40%, rgba(51, 65, 85, 0.2), rgba(51, 65, 85, 0))"
        }}
      />
      <div
        className="animate-bg-blob-c absolute bottom-[-8rem] left-[14%] h-[20rem] w-[20rem] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle at 45% 45%, rgba(255, 56, 92, 0.18), rgba(255, 56, 92, 0))"
        }}
      />
      <div
        className="animate-bg-blob-d absolute right-[10%] bottom-[-6rem] h-[18rem] w-[18rem] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle at 45% 45%, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0))"
        }}
      />
    </div>
  );
}

export default AnimatedBackground;
