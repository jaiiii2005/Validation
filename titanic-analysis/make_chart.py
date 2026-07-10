"""Chart of Titanic survival rates by gender, class, and age."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

df = pd.read_csv(r"c:/Users/ASUS/Validation/data-practice/titanic.csv")

g = df.groupby("Sex")["Survived"].mean() * 100
c = df.groupby("Pclass")["Survived"].mean() * 100
kids = df[df["Age"] < 16]["Survived"].mean() * 100
adults = df[df["Age"] >= 16]["Survived"].mean() * 100
overall = df["Survived"].mean() * 100

print(f"Overall survival: {overall:.1f}%  ({int(df['Survived'].sum())} of {len(df)})")
print(f"Gender: female {g['female']:.1f}%, male {g['male']:.1f}%")
print(f"Class: 1st {c[1]:.1f}%, 2nd {c[2]:.1f}%, 3rd {c[3]:.1f}%")
print(f"Age: children {kids:.1f}%, adults {adults:.1f}%")

fig, axes = plt.subplots(1, 3, figsize=(13, 4.2))
fig.suptitle("Titanic Survival Rates (%)", fontsize=15, fontweight="bold")

def label(ax, bars):
    for b in bars:
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 1.5,
                f"{b.get_height():.0f}%", ha="center", fontweight="bold")

b = axes[0].bar(["Female", "Male"], [g["female"], g["male"]], color=["#ec4899", "#3b82f6"])
axes[0].set_title("By Gender"); label(axes[0], b)
b = axes[1].bar(["1st", "2nd", "3rd"], [c[1], c[2], c[3]], color=["#22c55e", "#eab308", "#ef4444"])
axes[1].set_title("By Class (1=rich, 3=poor)"); label(axes[1], b)
b = axes[2].bar(["Children\n(<16)", "Adults"], [kids, adults], color=["#8b5cf6", "#64748b"])
axes[2].set_title("By Age"); label(axes[2], b)

for ax in axes:
    ax.set_ylim(0, 100)
    ax.set_ylabel("Survival rate %")
    ax.spines[["top", "right"]].set_visible(False)

plt.tight_layout(rect=[0, 0, 1, 0.93])
plt.savefig(r"c:/Users/ASUS/Validation/titanic-analysis/survival_chart.png", dpi=110)
print("Saved survival_chart.png")
